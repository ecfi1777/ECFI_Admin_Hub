

## Dashboard Landing Page

Replace the current Dashboard page (which just shows the Schedule) with a proper landing page featuring a tile grid of all navigation options. Each tile links to its respective page, includes the icon and a short description, and respects the user's role (viewers won't see manager-only tiles).

### Layout
- **Desktop**: 3-column grid
- **Tablet**: 2-column grid  
- **Mobile**: 1-column grid

### Tiles (in order, matching the sidebar)
1. **Projects** -- Manage all your projects
2. **Schedule** -- Daily schedule and entries
3. **Calendar** -- Monthly and weekly calendar views
4. **Kanban** -- Visual project pipeline (manager+)
5. **Jobs to Invoice** -- Track invoicing status (manager+)
6. **Vendor Details** -- Vendor invoice tracking (manager+)
7. **Discrepancies** -- Yard and entry discrepancies (manager+)
8. **Reports** -- Generate and view reports (manager+)
9. **Settings** -- Manage your account and organization

Each tile will have:
- The matching icon from the sidebar
- The label as the title
- A short description
- Hover effect using the orange/amber accent color

### Route Change
- Add a new `/dashboard` route pointing to this new Dashboard page
- Change the `/` route to render `<DailySchedule />` (preserving the current Schedule as the root)
- Update the sidebar: add "Dashboard" as the first nav item (`/dashboard`), keep "Schedule" pointing to `/`
- After login, redirect to `/dashboard` instead of `/`

### Technical Details

**Files to modify:**
- `src/pages/Dashboard.tsx` -- Replace contents with tile grid using the same `allNavItems` array (extracted or duplicated with descriptions) and `useUserRole` for filtering
- `src/components/layout/AppLayout.tsx` -- Add "Dashboard" (`/dashboard`) as the first nav item with a `LayoutDashboard` icon
- `src/App.tsx` -- Add `/dashboard` route; change `/` to render Schedule; update `AuthRoute`/`OnboardingRoute` redirects to `/dashboard`

**No new dependencies needed.** Uses existing Tailwind classes, lucide icons, and role hooks.

