# UI Context

## Theme

Dark only. No light mode. The visual language is near-black, editorial, and precise: bright white primary type, soft gray supporting text, a restrained coral accent, and a subtle dotted background. The UI should feel focused and premium, with the accent reserved for primary actions, emphasis, and important status moments.

All colors are defined as CSS custom properties in `src/index.css` and mapped to Tailwind tokens via `@theme inline`. Components must use semantic tokens instead of hardcoded hex values or raw Tailwind color classes like `zinc-*`, `gray-*`, or `red-*`.

| Role              | CSS Variable             | Hex / Value                |
| ----------------- | ------------------------ | -------------------------- |
| Page background   | `--bg-base`              | `#050505`                  |
| Canvas background | `--bg-canvas`            | `#080808`                  |
| Surface           | `--bg-surface`           | `#0d0d0d`                  |
| Elevated surface  | `--bg-elevated`          | `#151515`                  |
| Subtle surface    | `--bg-subtle`            | `#1d1d1d`                  |
| Default border    | `--border-default`       | `#252525`                  |
| Subtle border     | `--border-subtle`        | `#383838`                  |
| Primary text      | `--text-primary`         | `#f7f7f5`                  |
| Secondary text    | `--text-secondary`       | `#c4c4c1`                  |
| Muted text        | `--text-muted`           | `#969694`                  |
| Faint text        | `--text-faint`           | `#5f5f5d`                  |
| Brand accent      | `--accent-primary`       | `#ff604d`                  |
| Brand hover       | `--accent-primary-hover` | `#ff7564`                  |
| Brand dim         | `--accent-primary-dim`   | `rgba(255, 96, 77, 0.14)` |
| AI accent         | `--accent-ai`            | `#ff604d`                  |
| AI text           | `--accent-ai-text`       | `#ff7564`                  |
| Error             | `--state-error`          | `#ff604d`                  |
| Success           | `--state-success`        | `#7ac79b`                  |
| Warning           | `--state-warning`        | `#f2b45f`                  |

Tailwind utility names map to these variables. Use `bg-base`, `bg-canvas`, `bg-surface`, `bg-elevated`, `text-copy-primary`, `text-copy-muted`, `border-surface-border`, `text-brand`, `hover:bg-brand-hover`, `bg-accent-dim`, etc.

Use the `bg-dotted` utility for hero-like or canvas-like sections. Dots should be low contrast, evenly spaced, and secondary to the content.

## Typography

| Role            | Font                     | CSS Variable        |
| --------------- | ------------------------ | ------------------- |
| UI text         | Inter                    | `--font-sans`       |
| Headings        | Inter                    | `--font-heading`    |
| Accent emphasis | Instrument Serif Italic  | `--font-accent`     |
| Code / mono     | Geist Mono               | `--font-geist-mono` |

Fonts are loaded through `@fontsource` in `src/index.css`. The base `body` uses Inter with `antialiased`.

Use large, confident sans-serif headings with tight tracking for hero-level statements. Use the serif italic accent sparingly for one emphasized word or short phrase, usually in coral. Body and supporting copy should be gray, centered when used in a hero, and comfortably spaced.

## Border Radius

Use moderate radius. Controls should feel modern but not overly soft.

| Context           | Class        |
| ----------------- | ------------ |
| Inline / small UI | `rounded-xl` |
| Cards / panels    | `rounded-2xl` |
| Modal / overlay   | `rounded-3xl` |

## Canvas

### Canvas Background

Canvas and hero surfaces sit on near-black backgrounds. Use low-contrast dot patterns for depth instead of heavy gradients.

### Node Color Palette

Nodes should remain dark and legible, with accents used for labels, outlines, and small indicators.

| Node fill | Text color | Character              |
| --------- | ---------- | ---------------------- |
| `#151515` | `#f7f7f5`  | Neutral dark (default) |
| `#241411` | `#ff7564`  | Brand / action         |
| `#1b1725` | `#9b8afb`  | AI                     |
| `#201b12` | `#f2b45f`  | Warning / queue        |
| `#142018` | `#7ac79b`  | Success / active       |
| `#171717` | `#c4c4c1`  | External / muted       |

### Edge Style

Smooth-step path with a small arrow marker. Default edge color should be muted gray and visually secondary to nodes. Selected edges may use the coral brand accent.

### Node Shapes

Support:

- `rectangle` - default general-purpose node
- `diamond` - decision / gateway
- `circle` - event / endpoint
- `pill` - service / process
- `cylinder` - database / storage
- `hexagon` - external system / boundary

### Connection Handles

Small circular handles, hidden by default, revealed on node hover or selection.

## Component Library

shadcn/ui on top of Tailwind. Components live in `src/components/ui/`. Use the shadcn CLI to add new primitives rather than writing them from scratch.

## Layout Patterns

- Editor workspace: full-viewport layout with a compact top navbar, floating sidebar overlay on the left, center canvas, and future slide-over AI sidebar on the right.
- Sidebars: floating overlay with dark semi-transparent background and subtle border.
- Modals and dialogs: centered overlay, `rounded-3xl`, dark background with backdrop blur.
- Navbar: top bar with dark background and bottom border.

## Icons

Lucide React. Stroke-based icons only. Icon sizes: `h-4 w-4` for inline, `h-5 w-5` for buttons, `h-8 w-8` for feature icons in empty states.
