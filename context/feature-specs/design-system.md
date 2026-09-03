Read `AGENTS.md` and `context/ui-context.md` before starting.

We're adding the design system and UI primitive components.

Install and configure `shadcn/ui`.

Add these shadcn components:

- Button
- Card
- Dialog
- Input
- Tabs
- Textarea
- ScrollArea

Do not modify the generated `components/ui/*` files after installation.

Also Install `lucide-react`.



Ensure all components match the existing dark theme in `globals.css`.

### Editor chrome specific marks

- [ ] `Button` supports icon-only toolbar actions for sidebar open / close controls.
- [ ] `Tabs` is available for the project sidebar `My Projects` and `Shared` views.
- [ ] `Dialog` styling uses existing `globals.css` color tokens and supports title, description, and footer actions for future dialogs.
- [ ] `lucide-react` includes the editor chrome icons: `PanelLeftOpen`, `PanelLeftClose`, and `Plus`.
- [ ] Dark theme tokens cover top navbar, floating sidebar overlay, subtle borders, empty states, and bottom action area.

### Check when done

- All components import without errors
- `cn()` works properly
- No default light styling appears
