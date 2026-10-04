import { UserButton } from "@clerk/react"
import {
  ArrowDownRight,
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  LoaderCircle,
  Menu,
  Network,
  Pencil,
  Workflow,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { ArchitectureIcon } from "@/components/editor/architecture-icons"
import { SIGN_IN_URL, SIGN_UP_URL } from "@/lib/auth-routes"
import { cn } from "@/lib/utils"

const steps = [
  {
    number: "01",
    title: "Describe the system",
    description: "Start with the application you want to build and the constraints that matter.",
    icon: Workflow,
  },
  {
    number: "02",
    title: "Review the generated canvas",
    description: "Get a structured architecture with components and connections you can inspect.",
    icon: Network,
  },
  {
    number: "03",
    title: "Edit components and connections",
    description: "Shape the design as the idea evolves, then keep the workspace ready for the next decision.",
    icon: Pencil,
  },
]

const demoPrompt = "Design a workout tracking app with a Telegram bot and PostgreSQL."

const previewNodes = [
  { iconKey: "client", label: "Client", className: "left-1/2 top-[5%] -translate-x-1/2 md:left-[3%] md:top-[38%] md:translate-x-0" },
  { iconKey: "api", label: "API", className: "left-1/2 top-[20%] -translate-x-1/2 md:left-[27%] md:top-[38%] md:translate-x-0" },
  { iconKey: "server", label: "Service", className: "left-1/2 top-[35%] -translate-x-1/2 md:left-[47%] md:top-[38%] md:translate-x-0 lg:left-[51%]" },
  { iconKey: "queue", label: "Queue", className: "left-1/2 top-[50%] -translate-x-1/2 md:left-[47%] md:top-[70%] md:translate-x-0 lg:left-[51%]" },
  { iconKey: "worker", label: "Worker", className: "left-1/2 top-[65%] -translate-x-1/2 md:left-[67%] md:top-[70%] md:translate-x-0 lg:left-[74%]" },
  { iconKey: "database", label: "PostgreSQL", className: "left-1/2 top-[80%] -translate-x-1/2 md:left-[67%] md:top-[19%] md:translate-x-0 lg:left-[74%]" },
]

function LandingNode({ iconKey, label, className, visible }) {
  return (
    <div
      className={cn(
        "absolute flex h-12 w-[11rem] items-center gap-2 rounded-lg border border-border-subtle bg-surface px-2.5 text-left shadow-xl transition-[opacity,transform] duration-500 md:h-[4.75rem] md:w-[10.5rem] md:px-3",
        visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0",
        className
      )}
      aria-hidden={!visible}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-surface-border bg-base/70 text-brand sm:h-9 sm:w-9">
        <ArchitectureIcon iconKey={iconKey} className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>
      <span className="min-w-0 truncate text-xs font-semibold text-copy-primary sm:text-sm">
        {label}
      </span>
    </div>
  )
}

function CanvasPreview() {
  const [typedPrompt, setTypedPrompt] = useState("")
  const [phase, setPhase] = useState("typing")
  const [visibleNodeCount, setVisibleNodeCount] = useState(0)

  useEffect(() => {
    let timer

    if (phase === "typing") {
      if (typedPrompt.length < demoPrompt.length) {
        timer = window.setTimeout(() => {
          setTypedPrompt(demoPrompt.slice(0, typedPrompt.length + 1))
        }, 34)
      } else {
        timer = window.setTimeout(() => setPhase("generating"), 650)
      }
    }

    if (phase === "generating") {
      if (visibleNodeCount < previewNodes.length) {
        timer = window.setTimeout(() => {
          setVisibleNodeCount((count) => count + 1)
        }, 320)
      } else {
        timer = window.setTimeout(() => setPhase("complete"), 500)
      }
    }

    if (phase === "complete") {
      timer = window.setTimeout(() => {
        setTypedPrompt("")
        setVisibleNodeCount(0)
        setPhase("typing")
      }, 2200)
    }

    return () => window.clearTimeout(timer)
  }, [phase, typedPrompt, visibleNodeCount])

  const status = {
    typing: { label: "typing prompt", className: "text-brand" },
    generating: { label: "generating canvas", className: "text-brand" },
    complete: { label: "canvas ready", className: "text-state-success" },
  }[phase]

  return (
    <div className="relative overflow-hidden rounded-xl border border-surface-border bg-canvas shadow-2xl">
      <div className="flex h-11 items-center justify-between border-b border-surface-border/70 bg-surface px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-surface-border bg-base text-brand">
            <Box className="h-3.5 w-3.5" />
          </span>
          <span className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-copy-secondary">
            workout-tracker
          </span>
        </div>
        <span className={cn("hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] sm:flex", status.className)}>
          {phase === "complete" ? <Check className="h-3 w-3" /> : <LoaderCircle className="h-3 w-3 animate-spin" />}
          {status.label}
        </span>
      </div>

      <div className="border-b border-surface-border/70 bg-base px-3 py-3 sm:px-4">
        <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-elevated px-3 py-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-brand">prompt</span>
          <span className="min-w-0 truncate text-[11px] text-copy-secondary">
            {typedPrompt || <span className="text-copy-faint">Describe the system you want to build</span>}
            {phase === "typing" && <span className="ml-0.5 inline-block h-3.5 w-px translate-y-[2px] animate-pulse bg-brand" />}
          </span>
        </div>
      </div>

      <div className="relative h-[30rem] overflow-hidden bg-dotted md:h-[25rem]">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker id="landing-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 z" fill="var(--text-primary)" />
            </marker>
          </defs>
          <g className="md:hidden" fill="none" stroke="var(--text-primary)" strokeOpacity="0.72" strokeWidth="0.35" markerEnd="url(#landing-arrow)">
            <path className="transition-opacity duration-500" d="M50 15 C50 17, 50 18, 50 20" opacity={visibleNodeCount >= 2 ? 1 : 0} />
            <path className="transition-opacity duration-500" d="M50 30 C50 32, 50 33, 50 35" opacity={visibleNodeCount >= 3 ? 1 : 0} />
            <path className="transition-opacity duration-500" d="M50 45 C50 47, 50 48, 50 50" opacity={visibleNodeCount >= 4 ? 1 : 0} />
            <path className="transition-opacity duration-500" d="M50 60 C50 62, 50 63, 50 65" opacity={visibleNodeCount >= 5 ? 1 : 0} />
            <path className="transition-opacity duration-500" d="M50 75 C50 77, 50 78, 50 80" opacity={visibleNodeCount >= 6 ? 1 : 0} />
          </g>
          <g className="hidden md:block" fill="none" stroke="var(--text-primary)" strokeOpacity="0.72" strokeWidth="0.35" markerEnd="url(#landing-arrow)">
            <path className="transition-opacity duration-500" d="M17 50 C21 50, 23 50, 27 50" opacity={visibleNodeCount >= 2 ? 1 : 0} />
            <path className="transition-opacity duration-500" d="M41 50 C45 50, 47 50, 51 50" opacity={visibleNodeCount >= 3 ? 1 : 0} />
            <path className="transition-opacity duration-500" d="M65 47 C69 43, 70 31, 74 25" opacity={visibleNodeCount >= 4 ? 1 : 0} />
            <path className="transition-opacity duration-500" d="M61 58 C61 65, 59 70, 58 76" opacity={visibleNodeCount >= 5 ? 1 : 0} />
            <path className="transition-opacity duration-500" d="M68 82 C71 82, 72 82, 74 82" opacity={visibleNodeCount >= 6 ? 1 : 0} />
          </g>
        </svg>

        {previewNodes.map((node, index) => (
          <LandingNode key={node.label} {...node} visible={visibleNodeCount > index} />
        ))}

        <div className="absolute bottom-3 left-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-copy-faint sm:bottom-4 sm:left-4">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {phase === "complete" ? "editable architecture canvas" : "building editable canvas"}
        </div>
      </div>
    </div>
  )
}

function LandingPage({ isSignedIn, onNavigate }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [stepsVisible, setStepsVisible] = useState(false)
  const [activeStep, setActiveStep] = useState(null)
  const stepsSectionRef = useRef(null)
  const editorPath = "/editor"

  useEffect(() => {
    const section = stepsSectionRef.current

    if (!section || !("IntersectionObserver" in window)) {
      setStepsVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStepsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 }
    )

    observer.observe(section)

    return () => observer.disconnect()
  }, [])

  function goTo(path) {
    setIsMenuOpen(false)
    onNavigate(path)
  }

  function goToEditor() {
    goTo(isSignedIn ? editorPath : SIGN_IN_URL)
  }

  function goToSignUp() {
    goTo(SIGN_UP_URL)
  }

  return (
    <main className="min-h-screen bg-base text-copy-primary">
      <nav className="border-b border-surface-border/70 bg-base/95" aria-label="Main navigation">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <button
            type="button"
            onClick={() => goTo("/")}
            className="flex items-center gap-2.5 text-left"
            aria-label="ArchPilot home"
          >
            <span className="font-mono text-sm font-medium tracking-[0.08em] text-copy-primary">ArchPilot</span>
          </button>

          <div className="hidden items-center gap-7 md:flex">
            <a className="text-sm text-copy-muted transition-colors hover:text-copy-primary" href="#preview">
              Canvas preview
            </a>
            <a className="text-sm text-copy-muted transition-colors hover:text-copy-primary" href="#how-it-works">
              How it works
            </a>
          </div>

          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <>
                <UserButton />
                <button
                  type="button"
                  onClick={goToEditor}
                  className="hidden h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-semibold text-background transition-colors hover:bg-brand-hover sm:inline-flex"
                >
                  Open editor
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={goToSignUp} className="hidden px-2 py-2 text-sm text-copy-muted transition-colors hover:text-copy-primary sm:inline-flex">
                  Sign up
                </button>
                <button
                  type="button"
                  onClick={goToEditor}
                  className="hidden h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-semibold text-background transition-colors hover:bg-brand-hover sm:inline-flex"
                >
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-copy-secondary hover:bg-elevated hover:text-copy-primary sm:hidden"
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <div className="border-t border-surface-border/70 px-5 py-3 sm:hidden">
            <div className="flex flex-col gap-1">
              <a className="rounded-lg px-3 py-2.5 text-sm text-copy-secondary hover:bg-elevated" href="#preview" onClick={() => setIsMenuOpen(false)}>
                Canvas preview
              </a>
              <a className="rounded-lg px-3 py-2.5 text-sm text-copy-secondary hover:bg-elevated" href="#how-it-works" onClick={() => setIsMenuOpen(false)}>
                How it works
              </a>
              {!isSignedIn && (
                <button type="button" onClick={goToSignUp} className="mt-1 flex items-center justify-between rounded-lg border border-surface-border px-3 py-2.5 text-left text-sm font-medium text-copy-secondary">
                  Sign up
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={goToEditor} className="mt-1 flex items-center justify-between rounded-lg bg-brand px-3 py-2.5 text-left text-sm font-semibold text-background">
                {isSignedIn ? "Open editor" : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </nav>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:px-10 lg:pt-28">
        <div>
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-copy-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Live editable canvas
            </div>
            <h1 className="mx-auto mt-7 max-w-3xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-copy-primary sm:text-5xl lg:text-7xl">
              Turn a system idea into an <span className="text-brand">architecture diagram.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-copy-muted sm:text-lg sm:leading-8">
              Describe the application you want to build. ArchPilot generates an editable canvas with components and connections, so you can inspect the design and keep refining it.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={goToEditor}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-background transition-colors hover:bg-brand-hover"
              >
                Start designing
                <ArrowRight className="h-4 w-4" />
              </button>
              <a href="#how-it-works" className="inline-flex h-11 items-center gap-2 rounded-lg border border-surface-border px-4 text-sm font-medium text-copy-secondary transition-colors hover:border-border-subtle hover:bg-elevated hover:text-copy-primary">
                See how it works
                <ArrowDownRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-9 flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.13em] text-copy-faint">
              <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-state-success" /> editable nodes</span>
              <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-state-success" /> connected workspaces</span>
            </div>
          </div>
          <div id="preview" className="mt-16 scroll-mt-24 sm:mt-20">
            <CanvasPreview />
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-copy-faint">
              Live generation preview · prompt to editable canvas
            </p>
          </div>
        </div>
      </section>

      <section ref={stepsSectionRef} id="how-it-works" className="scroll-mt-20 border-t border-surface-border/70 bg-surface/35">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand">A shorter path to clarity</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-copy-primary sm:text-3xl">From prompt to a design you can work with.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-copy-muted">Keep the architecture close to the conversation, then make the important decisions on the canvas.</p>
          </div>
          <div className="mt-12 grid border-y border-surface-border/70 md:grid-cols-3">
            {steps.map(({ number, title, description, icon: Icon }, index) => {
              const isActive = activeStep === index
              const arrowIsActive = activeStep === index || activeStep === index + 1

              return (
                <div key={number} className={cn("relative transition-[transform] duration-300", stepsVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")} style={{ transitionDelay: `${index * 140}ms` }}>
                  <div
                    className={cn(
                      "group/step min-h-56 cursor-default py-7 transition-[border-color,background-color,transform] duration-300 md:px-7 md:py-8",
                      index > 0 && "border-t border-surface-border/70 md:border-l md:border-t-0",
                      isActive && "-translate-y-1 bg-accent-dim"
                    )}
                    onPointerEnter={() => setActiveStep(index)}
                    onPointerLeave={() => setActiveStep(null)}
                    onPointerDown={() => setActiveStep(index)}
                    onFocus={() => setActiveStep(index)}
                    onBlur={() => setActiveStep(null)}
                    tabIndex={0}
                  >
                    <div className="flex items-center justify-between px-5 md:px-0">
                      <span className={cn("font-mono text-[11px] tracking-[0.16em] transition-colors duration-300", isActive ? "text-brand" : "text-copy-faint")}>
                        {number}
                      </span>
                      <Icon className={cn("h-4 w-4 text-copy-faint transition-[color,transform] duration-300", isActive && "-translate-y-1 rotate-[-8deg] text-brand")} />
                    </div>
                    <div className="px-5 md:px-0">
                      <h3 className="mt-8 text-base font-semibold text-copy-primary">{title}</h3>
                      <p className="mt-3 max-w-xs text-sm leading-6 text-copy-muted">{description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn("pointer-events-none absolute -bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center rounded-full border border-surface-border bg-surface p-1 transition-[border-color,background-color,color,transform] duration-300 md:bottom-auto md:left-auto md:right-[-0.7rem] md:top-1/2 md:translate-x-0 md:-translate-y-1/2", arrowIsActive && "scale-110 border-brand bg-accent-dim text-brand")}>
                      <ArrowRight className={cn("h-3.5 w-3.5 rotate-90 text-copy-faint transition-[color,transform] duration-300 md:rotate-0", arrowIsActive && "translate-x-0.5 text-brand")} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-copy-faint">
            Hover with a pointer or tap a step to trace the flow
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-7 rounded-xl border border-surface-border bg-surface px-6 py-8 sm:flex-row sm:items-center sm:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand">Ready when the idea is</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-copy-primary">Make the first architecture decision visible.</h2>
          </div>
          <button type="button" onClick={goToEditor} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-background transition-colors hover:bg-brand-hover">
            Start designing
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <footer className="border-t border-surface-border/70">
        <div className="mx-auto flex min-h-64 max-w-7xl items-center justify-center px-5 py-20 text-center sm:min-h-80 sm:px-8 sm:py-24 lg:px-10">
          <div className="max-w-sm">
            <span className="font-mono text-sm font-medium tracking-[0.08em] text-copy-primary">ArchPilot</span>
            <p className="mt-4 text-sm leading-6 text-copy-muted">
              System design, kept editable. Describe an idea, inspect the architecture, and keep refining the canvas.
            </p>
          </div>
        </div>
      </footer>

    </main>
  )
}

export { LandingPage }
