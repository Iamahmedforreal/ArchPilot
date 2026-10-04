import { SignIn, SignUp } from "@clerk/react"

import { AFTER_SIGN_IN_URL, AFTER_SIGN_UP_URL, SIGN_IN_URL, SIGN_UP_URL } from "@/lib/auth-routes"

const clerkFormAppearance = {
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "var(--accent-primary)",
    colorBackground: "var(--bg-surface)",
    colorInputBackground: "var(--bg-elevated)",
    colorInputText: "var(--text-primary)",
    colorText: "var(--text-primary)",
    colorTextSecondary: "var(--text-muted)",
    colorNeutral: "var(--text-secondary)",
    borderRadius: "var(--radius)",
  },
  elements: {
    rootBox: "w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md",
    card:
      "w-full rounded-2xl border border-surface-border bg-surface shadow-2xl sm:rounded-3xl",
    headerTitle: "text-copy-primary",
    headerSubtitle: "text-copy-muted",
    socialButtonsBlockButton:
      "h-9 bg-elevated border-surface-border text-copy-primary hover:bg-subtle sm:h-10",
    formButtonPrimary: "h-10 bg-brand text-background hover:bg-brand-hover",
    formFieldInput:
      "h-10 bg-elevated border-border-subtle text-copy-primary placeholder:text-copy-faint",
    footerActionText: "text-copy-muted",
    footerActionLink: "text-brand hover:text-brand-hover",
  },
}

function AuthPage({ mode }) {
  const AuthComponent = mode === "sign-up" ? SignUp : SignIn

  return (
    <main className="flex min-h-svh items-center justify-center overflow-y-auto bg-dotted px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-copy-primary sm:px-6 sm:py-8">
      <AuthComponent
        path={mode === "sign-up" ? SIGN_UP_URL : SIGN_IN_URL}
        routing="path"
        signInUrl={SIGN_IN_URL}
        signUpUrl={SIGN_UP_URL}
        fallbackRedirectUrl={mode === "sign-up" ? AFTER_SIGN_UP_URL : AFTER_SIGN_IN_URL}
        appearance={clerkFormAppearance}
      />
    </main>
  )
}

export { AuthPage }
