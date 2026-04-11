import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-blue-600">
          RaiseHub
        </Link>

        <div className="flex gap-4 text-sm text-gray-700">
          <Link href="/login" className="hover:text-blue-600">
            Login
          </Link>
          <Link href="/signup" className="hover:text-blue-600">
            Sign Up
          </Link>
          <Link href="/dashboard" className="hover:text-blue-600">
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  )
}