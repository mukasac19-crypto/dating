// src/app/auth/auth-code-error/page.tsx

import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Authentication Error
        </h1>

        <p className="text-gray-600 mb-6">
          This confirmation link is invalid, expired, or already used. Please sign in
          again or create a new account.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>

          <Link
            href="/signup"
            className="w-full border border-gray-300 text-gray-700 p-3 rounded-md hover:bg-gray-50 transition-colors"
          >
            Create New Account
          </Link>
        </div>
      </div>
    </main>
  )
}