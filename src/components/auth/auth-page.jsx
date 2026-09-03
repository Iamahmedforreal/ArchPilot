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

const authFeatures = [
  {
    title: "Architecture maps",
    description: "Map architecture decisions visually.",
  },
  {
    title: "Context-aware editor",
    description: "Keep system context close to the editor.",
  },
  {
    title: "Less implementation drift",
    description: "Move from idea to implementation with less drift.",
  },
]

function AuthIntro() {
  return (
    <section className="order-1 flex border-b border-surface-border bg-base px-6 py-10 lg:min-h-screen lg:flex-col lg:justify-center lg:border-b-0 lg:border-r lg:px-12">
      <div className="mx-auto w-full max-w-xl lg:mx-0">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-brand">
          ArchPilot
        </p>
        <h1 className="mt-6 max-w-sm text-3xl font-semibold tracking-tight text-copy-primary">
          Design systems before the first line ships.
        </h1>
        <ul className="mt-10 grid border border-surface-border sm:grid-cols-3 lg:grid-cols-1">
          {authFeatures.map((feature) => (
            <li
              key={feature.title}
              className="group min-h-40 border-t border-surface-border p-6 transition-[background-color,transform] duration-200 first:border-t-0 hover:-translate-y-1 hover:bg-surface sm:border-l sm:border-t-0 sm:first:border-l-0 lg:border-l-0 lg:border-t lg:first:border-t-0"
            >
              <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-brand">
                {feature.title}
              </p>
              <p className="mt-5 text-sm leading-6 text-copy-muted transition-colors duration-200 group-hover:text-copy-secondary">
                {feature.description}
              </p>
            </li>
          ))}
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
      <section className="order-2 flex min-h-[70vh] items-center justify-center px-6 py-10 lg:min-h-screen">
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
