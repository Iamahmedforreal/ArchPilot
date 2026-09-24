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

const authFeatures = [
  {
    title: "Architecture maps",
    description: "Turn early system decisions into an editable canvas.",
  },
  {
    title: "AI canvas draft",
    description: "Generate components and connections from a plain prompt.",
  },
  {
    title: "Project memory",
    description: "Keep diagrams and generated specs tied to each workspace.",
  },
]

function AuthIntro() {
  return (
    <section className="flex shrink-0 flex-col border-b border-surface-border bg-base px-4 py-8 sm:px-6 sm:py-10 lg:min-h-dvh lg:justify-center lg:border-b-0 lg:border-r lg:px-12 lg:py-10">
      <div className="mx-auto w-full max-w-xl lg:mx-0">
        <p className="font-mono text-xs font-medium uppercase text-brand">
          ArchPilot
        </p>
        <h1 className="mt-6 max-w-md text-balance text-4xl font-semibold leading-tight text-copy-primary">
          Design systems before the first line ships.
        </h1>
        <p className="mt-5 max-w-md text-pretty text-sm leading-6 text-copy-muted">
          Sign in to create project workspaces, generate an architecture canvas,
          and keep each design ready for refinement.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-3 lg:mt-10 lg:grid-cols-1">
          {authFeatures.map((feature) => (
            <li
              key={feature.title}
              className="rounded-2xl border border-surface-border bg-surface/80 p-5 shadow-lg"
            >
              <p className="font-mono text-xs font-medium uppercase text-brand">
                {feature.title}
              </p>
              <p className="mt-3 text-pretty text-sm leading-6 text-copy-muted">
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
    <main className="flex min-h-svh flex-col bg-base text-copy-primary lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)]">
      <AuthIntro />
      <section className="flex min-h-svh flex-col items-center justify-start gap-4 overflow-y-auto bg-dotted px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:py-8 lg:min-h-dvh lg:justify-center lg:bg-base lg:px-10">
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
