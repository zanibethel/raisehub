import './globals.css'
import type { Metadata } from 'next'
import Nav from './components/nav'

export const metadata: Metadata = {
  title: 'RaiseHub',
  description: 'Digital fundraising passes for schools and local businesses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  )
}