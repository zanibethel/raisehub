import { readFile } from 'node:fs/promises';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

type QaCredential = {
  name: string;
  role: string;
  scenario: string;
  email: string;
  temporary_password: string;
};

type ProfileRow = {
  role: string;
  is_demo: boolean;
  demo_group: string | null;
  onboarding_completed: boolean;
};

type EntitlementRow = {
  id: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
};

const QA_BATCH = 'qa_prelaunch_2026';
const QA_EMAIL_SUFFIX = '@raisehubtesting.com';

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];

      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (character === ',' && !insideQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function parseCredentialsCsv(csv: string): QaCredential[] {
  const lines = csv
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('The credentials CSV does not contain any QA users.');
  }

  const headers = parseCsvLine(lines[0]);

  const requiredHeaders = [
    'name',
    'role',
    'scenario',
    'email',
    'temporary_password',
  ];

  for (const requiredHeader of requiredHeaders) {
    if (!headers.includes(requiredHeader)) {
      throw new Error(
        `The credentials CSV is missing the "${requiredHeader}" column.`,
      );
    }
  }

  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    const record = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? '']),
    ) as Record<string, string>;

    for (const requiredHeader of requiredHeaders) {
      if (!record[requiredHeader]) {
        throw new Error(
          `CSV row ${rowIndex + 2} has no value for "${requiredHeader}".`,
        );
      }
    }

    return record as QaCredential;
  });
}

function expectedIsDemo(credential: QaCredential): boolean {
  return credential.email.startsWith('qa.demo.');
}

function expectedOnboardingComplete(credential: QaCredential): boolean {
  return !credential.scenario.toLowerCase().includes('incomplete');
}

function expectedActiveEntitlementCount(
  credential: QaCredential,
): number | null {
  if (credential.role !== 'customer') {
    return null;
  }

  return credential.scenario.toLowerCase().includes('donation-only')
    ? 1
    : 0;
}

function isActiveEntitlement(
  entitlement: EntitlementRow,
  now: Date,
): boolean {
  if (entitlement.status !== 'active') {
    return false;
  }

  if (new Date(entitlement.starts_at) > now) {
    return false;
  }

  return (
    entitlement.expires_at === null
    || new Date(entitlement.expires_at) > now
  );
}

async function verifyCredential(
  credential: QaCredential,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<string[]> {
  const failures: string[] = [];

  if (
    !credential.email.startsWith('qa.')
    || !credential.email.endsWith(QA_EMAIL_SUFFIX)
  ) {
    return [
      'Email is outside the approved qa.%@raisehubtesting.com namespace.',
    ];
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const {
    data: signInData,
    error: signInError,
  } = await supabase.auth.signInWithPassword({
    email: credential.email,
    password: credential.temporary_password,
  });

  if (signInError || !signInData.user || !signInData.session) {
    return [
      `Login failed: ${signInError?.message ?? 'No session was returned.'}`,
    ];
  }

  try {
    if (signInData.user.email !== credential.email) {
      failures.push(
        `Authenticated email was "${signInData.user.email ?? 'missing'}".`,
      );
    }

    if (
      signInData.user.user_metadata?.qa_seed_batch !== QA_BATCH
    ) {
      failures.push(
        `Auth metadata is missing qa_seed_batch="${QA_BATCH}".`,
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(
        'role,is_demo,demo_group,onboarding_completed',
      )
      .eq('id', signInData.user.id)
      .single<ProfileRow>();

    if (profileError || !profile) {
      failures.push(
        `Profile read failed: ${profileError?.message ?? 'No profile returned.'}`,
      );
    } else {
      if (profile.role !== credential.role) {
        failures.push(
          `Expected role "${credential.role}", received "${profile.role}".`,
        );
      }

      const isDemo = expectedIsDemo(credential);

      if (profile.is_demo !== isDemo) {
        failures.push(
          `Expected is_demo=${isDemo}, received ${profile.is_demo}.`,
        );
      }

      const expectedDemoGroup = isDemo ? QA_BATCH : null;

      if (profile.demo_group !== expectedDemoGroup) {
        failures.push(
          `Expected demo_group=${String(expectedDemoGroup)}, received ${String(profile.demo_group)}.`,
        );
      }

      const onboardingComplete =
        expectedOnboardingComplete(credential);

      if (
        profile.onboarding_completed !== onboardingComplete
      ) {
        failures.push(
          `Expected onboarding_completed=${onboardingComplete}, received ${profile.onboarding_completed}.`,
        );
      }
    }

    const expectedEntitlements =
      expectedActiveEntitlementCount(credential);

    if (expectedEntitlements !== null) {
      const {
        data: entitlements,
        error: entitlementError,
      } = await supabase
        .from('customer_entitlements')
        .select('id,status,starts_at,expires_at')
        .eq('user_id', signInData.user.id)
        .returns<EntitlementRow[]>();

      if (entitlementError) {
        failures.push(
          `Entitlement read failed: ${entitlementError.message}`,
        );
      } else {
        const now = new Date();
        const activeCount = (entitlements ?? []).filter(
          (entitlement) => isActiveEntitlement(
            entitlement,
            now,
          ),
        ).length;

        if (activeCount !== expectedEntitlements) {
          failures.push(
            `Expected ${expectedEntitlements} active entitlement(s), received ${activeCount}.`,
          );
        }
      }
    }
  } finally {
    await supabase.auth.signOut();
  }

  return failures;
}

async function main(): Promise<void> {
  const credentialsPath = process.argv[2];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!credentialsPath) {
    throw new Error(
      'Usage: npx tsx scripts/qa-auth-smoke.ts /private/path/raisehub-qa-test-users.csv',
    );
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.',
    );
  }

  const csv = await readFile(credentialsPath, 'utf8');
  const credentials = parseCredentialsCsv(csv);

  console.log(
    `Verifying ${credentials.length} QA login(s) against ${supabaseUrl}...`,
  );

  let failureCount = 0;

  for (const credential of credentials) {
    const failures = await verifyCredential(
      credential,
      supabaseUrl,
      supabaseAnonKey,
    );

    if (failures.length === 0) {
      console.log(
        `PASS ${credential.email} (${credential.role})`,
      );
      continue;
    }

    failureCount += 1;
    console.error(
      `FAIL ${credential.email} (${credential.role})`,
    );

    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
  }

  if (failureCount > 0) {
    throw new Error(
      `${failureCount} QA login(s) failed verification.`,
    );
  }

  console.log(
    'All QA logins and authenticated profile checks passed.',
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : String(error);

  console.error(`QA auth smoke test failed: ${message}`);
  process.exitCode = 1;
});