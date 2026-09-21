Redesign the existing ArchPilot AI sidebar UI so it looks like a clean, compact assistant panel over the canvas editor.


## Layout

1. Display the sidebar as an overlay attached to the right side of the workspace.

2. Opening the sidebar must not resize, shift, or recalculate the React Flow canvas.

3. Do not use a side-by-side flex layout that reduces the canvas width.

4. Use these approximate desktop dimensions:

* width: 380px
* minimum width: 340px
* maximum width: 400px
* height: all available workspace height below the application header

5. Add a subtle left border and soft shadow to separate the panel from the canvas.

6. Use an appropriate `z-index` so the sidebar appears above the canvas.

7. Closing the sidebar should hide it without changing the canvas dimensions or viewport.

8. On small screens, display the sidebar as a full-width overlay.

## Panel structure

Divide the sidebar into three sections:

### Compact header

Keep the header fixed at the top.

Include:

* title: `ArchPilot Assistant`
* small subtitle or status using existing data
* close button

Remove or reduce:

* the oversized `Ask ArchPilot` heading
* large subtitle spacing
* decorative sparkle icon
* unnecessary empty space

Preserve the existing tabs only if they are currently functional. Make them smaller and visually secondary.

### Scrollable conversation area

The middle section should fill the remaining available space and scroll independently.

Keep all existing message content and functionality, but improve its presentation:

* user messages aligned to the right
* assistant messages aligned to the left
* compact message bubbles
* comfortable line height
* clear separation between messages
* restrained padding
* readable maximum message width

Simplify the empty state:

* use a short greeting
* show the existing suggested prompts
* make suggested prompts compact
* prevent suggestions from occupying most of the sidebar
* avoid oversized headings and decorative elements

The page and canvas must not scroll when the conversation becomes long.

### Bottom composer

Keep the existing composer visible at the bottom of the panel.

Reuse the existing input state, submit handler, keyboard behavior, and loading state.

Improve only its appearance:

* compact rounded input container
* textarea or input takes most of the row
* send icon inside or immediately beside the input
* clear focus state
* visually disabled send state
* reasonable input height
* small disclaimer below or above the input

Remove the separate visual `Ask ArchPilot` button if it duplicates the existing send action. Do not remove it if existing functionality depends on it; instead, restyle or reposition it without changing its handler.

## Canvas isolation

The sidebar must visually overlay the canvas without affecting its layout.

UI interactions inside the sidebar must not accidentally interact with the canvas:

* scrolling the conversation should not zoom the canvas
* clicking inside the panel should not select canvas elements
* typing in the input should not trigger canvas keyboard shortcuts

Only add event isolation needed for correct UI behavior. Do not change canvas state or business logic.

Do not:

* call `fitView` when opening or closing the sidebar
* move nodes
* resize the React Flow container
* reset the viewport
* change node or edge rendering
* redesign the canvas toolbar

## Visual style

Match the existing ArchPilot dark interface.

Use:

* near-black background
* slightly lighter input and message surfaces
* subtle gray borders
* off-white primary text
* muted gray secondary text
* orange only for active states and small accents
* compact spacing
* moderate corner radius
* subtle shadows

Avoid:

* gradients
* glowing effects
* large AI icons
* oversized headings
* excessive empty space
* large pill buttons
* marketing-page styling
* unnecessary animations

The sidebar should feel like a professional IDE assistant panel, not a landing-page section.

## Responsive behavior

### Desktop

* right-side overlay
* approximately 380px wide
* canvas remains full width behind it

### Tablet

* width around 360px or a reasonable percentage of the viewport
* remain attached to the right

### Mobile

* full-width overlay
* header and composer remain visible
* conversation area scrolls independently

## Accessibility

* Preserve visible focus styles.
* Keep accessible labels for icon buttons.
* Ensure adequate text contrast.
* Keep the close button easy to find.
* Do not change existing keyboard behavior.

## Scope limits

Do not add:

* new AI capabilities
* automatic canvas changes
* new prompts or prompt-processing logic
* new API endpoints
* canvas persistence
* Liveblocks
* new state-management architecture
* new tabs
* new assistant modes

Do not refactor unrelated components.

## Check when done

* The sidebar is compact and approximately 380px wide on desktop.
* It overlays the canvas instead of shrinking it.
* Opening and closing it does not move canvas content.
* The conversation area scrolls independently.
* The composer remains visible at the bottom.
* The existing chat functionality remains unchanged.
* Existing buttons and handlers continue working.
* The design matches the ArchPilot dark theme.
* Desktop and mobile layouts work correctly.
* The project build and type checks pass.
