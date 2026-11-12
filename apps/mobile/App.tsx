import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { apiBaseUrl, supabase } from './src/auth'
import type { MobileWorkspace } from '../../src/lib/mobile/workspace-contract'

type Bootstrap = {
  user: { id: string; email: string | null }
  workspaces: MobileWorkspace[]
}

const experiences: Record<MobileWorkspace['kind'], {
  heading: string
  message: string
  nextScreens: string[]
}> = {
  customer: {
    heading: 'My Pass',
    message: 'Discover local deals and support fundraising campaigns.',
    nextScreens: ['Discover offers', 'Saved deals', 'My Pass'],
  },
  fundraising: {
    heading: 'My Fundraising',
    message: 'Your campaigns and seller progress belong here.',
    nextScreens: ['My campaigns', 'Seller progress', 'Share fundraiser'],
  },
  organization: {
    heading: 'Organization',
    message: 'Track your organization and its fundraising activity.',
    nextScreens: ['Campaign overview', 'Members', 'Reporting'],
  },
  business: {
    heading: 'Business',
    message: 'Manage offers, redemptions, and business performance.',
    nextScreens: ['Offers', 'Redemptions', 'Analytics'],
  },
  owner: {
    heading: 'Owner Platform',
    message: 'Your platform command center, subject to owner permissions.',
    nextScreens: ['Attention Center', 'Manage Platform', 'Support'],
  },
}

function SignIn({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit() {
    if (!supabase || busy) return
    setBusy(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError) throw authError
      onSuccess()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.authBody} keyboardShouldPersistTaps="handled">
        <View style={styles.mark}><Text style={styles.markText}>R</Text></View>
        <Text style={styles.title}>Welcome to RaiseHub</Text>
        <Text style={styles.muted}>One account. All your workspaces.</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          accessibilityLabel="Password"
          autoComplete="password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={[styles.button, busy && styles.disabled]}
          disabled={busy}
          onPress={submit}
        >
          <Text style={styles.buttonText}>{busy ? 'Working…' : 'Sign in'}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          disabled={busy}
          onPress={() => {
            if (apiBaseUrl?.startsWith('https://')) {
              void Linking.openURL(apiBaseUrl.replace(/\/$/, '') + '/signup')
            }
          }}
        >
          <Text style={styles.secondaryText}>Create an account on RaiseHub</Text>
        </Pressable>
        <Text style={styles.footnote}>
          New account registration uses RaiseHub's existing secure onboarding
          on the website. Your login then works in this app. Mobile feature
          screens are being connected in stages.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!supabase) {
      setInitialized(true)
      return
    }

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setInitialized(true)
    }).catch(() => {
      if (active) setInitialized(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setBootstrap(null)
      setSelectedKey(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setBootstrap(null)

    async function load() {
      if (!apiBaseUrl || !apiBaseUrl.startsWith('https://')) {
        throw new Error('Mobile API URL is not configured for HTTPS.')
      }
      const response = await fetch(
        apiBaseUrl.replace(/\/$/, '') + '/api/mobile/v1/workspaces',
        {
          headers: {
            Authorization: 'Bearer ' + session!.access_token,
            Accept: 'application/json',
          },
        }
      )
      if (response.status === 401) {
        throw new Error('Your session needs to be refreshed. Sign out and back in.')
      }
      if (!response.ok) throw new Error('Unable to load your RaiseHub workspaces.')
      const payload = (await response.json()) as Bootstrap
      if (!Array.isArray(payload.workspaces)) throw new Error('Invalid workspace response')
      return payload
    }

    load()
      .then((payload) => {
        if (!cancelled) setBootstrap(payload)
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Unable to load workspaces.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [session?.access_token, revision])

  const selected = useMemo(() => {
    const workspaces = bootstrap?.workspaces ?? []
    return (
      workspaces.find((workspace) => workspace.key === selectedKey) ??
      workspaces.find((workspace) => workspace.isDefault) ??
      workspaces.find((workspace) => workspace.kind === 'customer') ??
      workspaces[0] ??
      null
    )
  }, [bootstrap, selectedKey])

  if (!initialized) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={styles.centered} size="large" color="#2463eb" />
      </SafeAreaView>
    )
  }

  if (!supabase) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.page}>
          <Text style={styles.title}>RaiseHub mobile setup</Text>
          <Text style={styles.muted}>Configure the publishable Supabase URL and anon key in apps/mobile/.env before testing.</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!session) return <SignIn onSuccess={() => setRevision((r) => r + 1)} />

  const experience = selected ? experiences[selected.kind] : null

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brand}>RaiseHub</Text>
            <Text style={styles.muted}>One account · Multiple experiences</Text>
          </View>
          <Pressable onPress={() => { void supabase?.auth.signOut() }}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>

        <Text style={styles.account}>{bootstrap?.user.email ?? session.user.email ?? 'Your account'}</Text>
        <Text style={styles.sectionTitle}>Switch experience</Text>
        <Text style={styles.muted}>These workspaces come from your verified memberships and permissions.</Text>

        {loading ? <ActivityIndicator style={styles.spinner} color="#2463eb" /> : null}
        {error ? (
          <View style={styles.warning}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => setRevision((r) => r + 1)}>
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.workspaces}>
          {(bootstrap?.workspaces ?? []).map((workspace) => (
            <Pressable
              key={workspace.key}
              style={[
                styles.workspaceChip,
                selected?.key === workspace.key && styles.workspaceChipSelected,
              ]}
              onPress={() => setSelectedKey(workspace.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: selected?.key === workspace.key }}
            >
              <Text style={[
                styles.chipText,
                selected?.key === workspace.key && styles.chipTextSelected,
              ]}>{workspace.name}</Text>
              <Text style={styles.chipHint}>{workspace.subtitle ?? workspace.kind}</Text>
            </Pressable>
          ))}
        </View>

        {selected && experience ? (
          <View style={styles.panel}>
            <Text style={styles.eyebrow}>{selected.kind.toUpperCase()}</Text>
            <Text style={styles.title}>{experience.heading}</Text>
            <Text style={styles.muted}>{experience.message}</Text>
            {experience.nextScreens.map((name) => (
              <View key={name} style={styles.featureRow}>
                <Text style={styles.featureLabel}>{name}</Text>
                <Text style={styles.comingSoon}>Next phase</Text>
              </View>
            ))}
          </View>
        ) : !loading && !error ? (
          <Text style={styles.muted}>No workspaces were returned. Please refresh.</Text>
        ) : null}

        <Text style={styles.footnote}>
          Phase 1 developer preview: secure login and the shared workspace
          selector are the foundation. Individual mobile feature screens are
          not live yet. Website workflows remain unchanged.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f9fc' },
  centered: { flex: 1 },
  page: { padding: 20, paddingBottom: 48, gap: 12 },
  authBody: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  mark: { width: 54, height: 54, borderRadius: 17, backgroundColor: '#2055c9', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  markText: { fontSize: 28, color: '#fff', fontWeight: '900' },
  brand: { fontSize: 24, fontWeight: '900', color: '#122a52' },
  title: { fontSize: 26, fontWeight: '800', color: '#122a52', marginBottom: 6 },
  muted: { fontSize: 14, color: '#52627b', lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '700', color: '#20344f', marginTop: 18, marginBottom: 7 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#c9d5e7', minHeight: 48, paddingHorizontal: 14, fontSize: 16, color: '#102647' },
  button: { backgroundColor: '#2563eb', borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  disabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryButton: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#2055c9', fontWeight: '700' },
  error: { color: '#b42318', fontSize: 14, lineHeight: 20 },
  notice: { color: '#267447', fontSize: 14 },
  footnote: { fontSize: 12, color: '#718096', lineHeight: 18, marginTop: 24 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  signOut: { color: '#2055c9', fontWeight: '700' },
  account: { fontSize: 12, color: '#778398', marginTop: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#142c4b', marginTop: 18 },
  spinner: { marginVertical: 30 },
  warning: { padding: 16, backgroundColor: '#fff5f3', borderRadius: 12, gap: 10 },
  retry: { color: '#2055c9', fontWeight: '700' },
  workspaces: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  workspaceChip: { padding: 12, borderRadius: 13, borderWidth: 1, borderColor: '#d1dcf0', backgroundColor: '#fff', minWidth: 144, flexGrow: 1, gap: 4 },
  workspaceChipSelected: { borderColor: '#2563eb', backgroundColor: '#e8f0ff' },
  chipText: { fontSize: 14, fontWeight: '800', color: '#193753' },
  chipTextSelected: { color: '#184aa9' },
  chipHint: { fontSize: 11, color: '#64748b' },
  panel: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginTop: 20, gap: 12 },
  eyebrow: { fontSize: 11, letterSpacing: 1.5, color: '#2563eb', fontWeight: '800' },
  featureRow: { paddingVertical: 12, borderTopColor: '#e6ebf3', borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featureLabel: { fontSize: 15, color: '#243953', fontWeight: '600' },
  comingSoon: { fontSize: 11, color: '#64748b' },
})
