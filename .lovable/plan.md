## Auto-fill Crew Allowance rates from P&L Labor

When labor is entered on the P&L tab (stored in `project_pl_revenue.labor_override`), the Commission tab's Crew Allowance window will pre-populate the Rate per CY and % of Invoice inputs from that labor value — but only when the user hasn't already saved their own values. The user can still override either input, and their overrides win.

### Change: `src/components/projects/ProjectCommissionTab.tsx`

1. **Derive suggested rates from `crewLabor`** (already computed in the file):
   - `suggestedRatePerCy = totalFWYards > 0 ? crewLabor / totalFWYards : 0`
   - `suggestedPctOfInvoice = fwInvoiceTotal > 0 ? (crewLabor / fwInvoiceTotal) * 100 : 0`

2. **Update the `useEffect` that hydrates form state from `commission`**:
   - If `commission.rate_per_cy` is null/empty AND `suggestedRatePerCy > 0`, set `ratePerCy` to the suggested value (rounded to 2 decimals).
   - Same for `pctOfInvoice`.
   - If `commission` doesn't exist yet (new project), also seed both fields from the suggestions.
   - Any saved non-null value from the DB always wins over the suggestion.
   - Add `crewLabor`, `totalFWYards`, `fwInvoiceTotal` to the effect deps so the pre-fill re-runs after P&L labor changes.

3. **Persist the auto-filled values**: after the effect pre-fills, the existing `onBlur={handleSave}` on the inputs already writes to `project_commissions`. To make sure the auto-filled value is saved even without the user touching the input, trigger a one-time `handleSave` right after seeding (guarded so it only fires when we actually filled from a suggestion, not on every render).

4. **Small helper hint under each input** (subtle, muted): `"Suggested from P&L Labor: $X.XX"` / `"Suggested from P&L Labor: Y.YY%"` — visible whenever a suggestion exists, so the user knows where the number came from and can reset to it.

### What this does not change
- P&L tab, labor storage, commission report grouping, and the `crewLabor` calculation itself.
- Manual Override Amount field — still wins over both calc methods.
- Commissions already saved with explicit rate/% values are untouched.

### Result
On a project where the user enters, say, `$5,000` labor on the P&L tab and has `100 yd` F&W and `$50,000` F&W invoice:
- Rate per CY auto-fills to `$50.00`
- % of Invoice auto-fills to `10.00%`
- Crew Allowance immediately reflects the P&L labor across both calculation methods.
