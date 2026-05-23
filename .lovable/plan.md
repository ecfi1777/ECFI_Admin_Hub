## Make the desktop sidebar collapsible

Add a collapse/expand toggle to the desktop sidebar in `AppLayout.tsx` so the main content area can use more width.

### Behavior

- **Expanded (default)**: current 16rem (`w-64`) sidebar with logo, org switcher, full nav labels, theme toggle, email + logout.
- **Collapsed**: narrow rail (`w-14`) that still shows the ECFI logo, nav icons, theme toggle icon, and logout icon — labels hidden, OrganizationSwitcher hidden (or replaced with an icon-only placeholder), tooltips on hover show each nav label.
- **Toggle**: a small chevron button (`ChevronLeft` / `ChevronRight`) pinned to the top-right edge of the sidebar (or in the header strip) flips state.
- **Persistence**: remember the collapsed state in `localStorage` so it survives reloads.
- Mobile flow (Sheet drawer) is unchanged.

### Technical details

- New `collapsed` state in `AppLayout` (desktop branch only), initialized from `localStorage['sidebar-collapsed']`; updates write back to localStorage.
- Sidebar `<aside>` width swaps between `w-64` and `w-14` with a `transition-all` class.
- `renderNavLinks` accepts a `collapsed` flag; when true, hide the label `<span>`, center the icon, and wrap each link in `Tooltip` (shadcn) showing the label on the right.
- Header block: when collapsed, hide the title/subtitle and just show the logo, centered.
- `OrganizationSwitcher` and the email row are hidden when collapsed; logout icon stays.
- Theme toggle: collapsed variant becomes an icon-only button.
- Toggle button placed at the bottom of the sidebar (or top-right) using `ChevronLeft`/`ChevronRight`.

No backend, schema, or routing changes. Only `src/components/layout/AppLayout.tsx` is edited.
