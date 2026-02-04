# Credit Unions List from Supabase

The platform shows credit unions (e.g. LMCU, Navy Federal, 4,300+ CUs) from the **Supabase** `credit_unions` table when configured. Otherwise it falls back to a **demo list** of ~20 CUs.

## Why LMCU / other CUs aren’t listing

1. **Supabase not configured**  
   If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing (locally or in Vercel), the app uses a **mock client** that always returns empty data. The UI then shows the hardcoded **TOP 20** list only (LMCU is not in that list).

2. **`credit_unions` table empty or missing**  
   Even with env vars set, if the table has no rows (or doesn’t exist), the list will be empty and the app falls back to the demo list.

3. **RLS blocking reads**  
   If Row Level Security is enabled on `credit_unions`, the `anon` role must have `SELECT` permission so the browser client can load the list.

## Fix

- **Local:** Add to `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...` (from Supabase → Settings → API → anon public)

- **Vercel:** Same variables in **Settings → Environment Variables**.

- **Database:** Ensure `credit_unions` exists and is populated (e.g. via `app/api/cron/seed-credit-unions`, `seed-logos`, or your own seed/migration). Expected columns include: `id`, `name`, `charter`, `city`, `state_id`, `website`, `total_assets`, `total_members`, `logo_url`, `primary_color`, `og_image_url`.

- **RLS:** Add a policy on `credit_unions` that allows `anon` to `SELECT` (e.g. allow all for read-only listing).

After fixing, the CU picker in the sidebar will load from Supabase and show LMCU and the full set. If you still see the demo list, the UI shows a banner: *"Demo list only. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY..."* — use that as a reminder to check env and table.
