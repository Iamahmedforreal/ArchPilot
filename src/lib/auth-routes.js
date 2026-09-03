const SIGN_IN_URL = import.meta.env.VITE_CLERK_SIGN_IN_URL || "/sign-in"
const SIGN_UP_URL = import.meta.env.VITE_CLERK_SIGN_UP_URL || "/sign-up"
const AFTER_SIGN_IN_URL = import.meta.env.VITE_CLERK_AFTER_SIGN_IN_URL || "/editor"
const AFTER_SIGN_UP_URL = import.meta.env.VITE_CLERK_AFTER_SIGN_UP_URL || "/editor"

const PUBLIC_AUTH_ROUTES = [SIGN_IN_URL, SIGN_UP_URL]

function normalizePath(pathname) {
  if (!pathname || pathname === "/") {
    return "/"
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
}

function isPublicAuthRoute(pathname) {
  const normalizedPathname = normalizePath(pathname)

  return PUBLIC_AUTH_ROUTES.some(
    (route) =>
      normalizedPathname === route || normalizedPathname.startsWith(`${route}/`)
  )
}

function isSignInRoute(pathname) {
  const normalizedPathname = normalizePath(pathname)

  return (
    normalizedPathname === SIGN_IN_URL ||
    normalizedPathname.startsWith(`${SIGN_IN_URL}/`)
  )
}

function isSignUpRoute(pathname) {
  const normalizedPathname = normalizePath(pathname)

  return (
    normalizedPathname === SIGN_UP_URL ||
    normalizedPathname.startsWith(`${SIGN_UP_URL}/`)
  )
}

export {
  AFTER_SIGN_IN_URL,
  AFTER_SIGN_UP_URL,
  PUBLIC_AUTH_ROUTES,
  SIGN_IN_URL,
  SIGN_UP_URL,
  isPublicAuthRoute,
  isSignInRoute,
  isSignUpRoute,
  normalizePath,
}
