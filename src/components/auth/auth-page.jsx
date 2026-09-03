import { SignIn, SignUp } from "@clerk/react"

import { AFTER_SIGN_IN_URL, AFTER_SIGN_UP_URL, SIGN_IN_URL, SIGN_UP_URL } from "@/lib/auth-routes"

const clerkFormAppearance = {
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
    card: "bg-surface border border-surface-border shadow-2xl",
    headerTitle: "text-copy-primary",
    headerSubtitle: "text-copy-muted",
    socialButtonsBlockButton:
      "bg-elevated border-surface-border text-copy-primary hover:bg-subtle",
    formButtonPrimary: "bg-brand text-background hover:bg-brand-hover",
    formFieldInput:
      "bg-elevated border-border-subtle text-copy-primary placeholder:text-copy-faint",
    footerActionText: "text-copy-muted",
    footerActionLink: "text-brand hover:text-brand-hover",
  },
}

function AuthIntro() {
  return (
    <section className="hidden min-h-screen flex-col justify-center border-r border-surface-border bg-base px-12 lg:flex">
      <div className="max-w-sm">
        <p className="font-mono text-sm text-brand">ArchPilot</p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-copy-primary">
          Design systems before the first line ships.
        </h1>
        <ul className="mt-8 space-y-3 text-sm leading-6 text-copy-muted">
          <li>Map architecture decisions visually.</li>
          <li>Keep system context close to the editor.</li>
          <li>Move from idea to implementation with less drift.</li>
        </ul>
      </div>
    </section>
  )
}

function AuthPage({ mode }) {
  const AuthComponent = mode === "sign-up" ? SignUp : SignIn

  return (
    <main className="grid min-h-screen bg-base text-copy-primary lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)]">
      <AuthIntro />
      <section className="flex min-h-screen items-center justify-center px-6 py-10">
        <AuthComponent
          path={mode === "sign-up" ? SIGN_UP_URL : SIGN_IN_URL}
          routing="path"
          signInUrl={SIGN_IN_URL}
          signUpUrl={SIGN_UP_URL}
          fallbackRedirectUrl={mode === "sign-up" ? AFTER_SIGN_UP_URL : AFTER_SIGN_IN_URL}
          appearance={clerkFormAppearance}
        />
      </section>
    </main>
  )
}

export { AuthPage }
