const runtime = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> }
}

const signInUrl = runtime.process?.env?.VITE_CLERK_SIGN_IN_URL || "/sign-in"
const signUpUrl = runtime.process?.env?.VITE_CLERK_SIGN_UP_URL || "/sign-up"

export const publicRoutes = [signInUrl, signUpUrl]

export function isPublicRoute(pathname: string) {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}
