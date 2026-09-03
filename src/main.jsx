import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from "@clerk/react"
import { dark } from "@clerk/ui/themes"
import './index.css'
import App from './App.jsx'
import { AFTER_SIGN_IN_URL, AFTER_SIGN_UP_URL, SIGN_IN_URL, SIGN_UP_URL } from "@/lib/auth-routes"

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const clerkAppearance = {
  baseTheme: dark,
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
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={clerkAppearance}
      signInUrl={SIGN_IN_URL}
      signUpUrl={SIGN_UP_URL}
      afterSignInUrl={AFTER_SIGN_IN_URL}
      afterSignUpUrl={AFTER_SIGN_UP_URL}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
