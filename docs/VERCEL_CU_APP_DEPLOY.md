# Deploy to cu.app on Vercel

Get this project live at **cu.app** using a new Vercel project. Domain is at GoDaddy and can be connected in Vercel.

---

## Quick: Deploy config matrix to existing project (zero env vars)

Deploy **this config matrix builder only** to your existing Vercel project and see it live **without setting 300 env variables**. The app runs with fallback/mock data when Supabase (and other) env vars are missing.

**Vercel project ID:** `prj_0YRJPl6JvHZL1EBxgn1Ihl9D7GlT`

### One-time: link this repo to that project

From the project root:

```bash
cd /path/to/configuration-matrix-build
npx vercel link --project prj_0YRJPl6JvHZL1EBxgn1Ihl9D7GlT
```

When prompted, choose your **Vercel team/org** and confirm the project name. This writes `.vercel/project.json` so future deploys go to this project.

### Deploy (production)

```bash
npm run deploy
```

Or:

```bash
npx vercel --prod
```

**No env vars required.** The app will:

- Build and run with **zero** environment variables.
- Use built-in fallback data (e.g. TOP 20 credit unions, Navy Federal default) when Supabase is not configured.
- Show the full config UI; use **Settings** → **Admin / everything unlocked** to test without login/roles.

To add a real backend later, set in Vercel **Settings** → **Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional for some API routes)

---

## 0. Push to GitHub (do this first)

The project is already initialized with git and one commit. To push to GitHub:

1. **Create a new repo on GitHub:** [github.com/new](https://github.com/new)  
   - Name it e.g. `cu-app` or `configuration-matrix-build`  
   - Leave it empty (no README, no .gitignore).

2. **Add your repo as remote and push:**

```bash
cd /path/to/configuration-matrix-build
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name.  
If you use SSH: `git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git`

---

## 1. Create a new Vercel project

1. Go to [vercel.com](https://vercel.com) and sign in.
2. **Add New** → **Project**.
3. **Import** your Git repository (e.g. `kuscheux/cu-app` or the repo that contains this `configuration-matrix-build` app).
   - If the repo is the **root** of this Next.js app, import that repo and use **Root Directory**: `.` (or leave default).
   - If this app lives in a **subfolder** (e.g. `configuration-matrix-build`), set **Root Directory** to that folder.
4. **Framework Preset**: Vercel should detect **Next.js**.
5. **Build Command**: `npm run build` (default).
6. **Output Directory**: leave default (Next.js).
7. Do **not** deploy yet — add env vars and domain first.

---

## 2. Environment variables

In the project: **Settings** → **Environment Variables**. Add at least:

| Name | Value | Notes |
|------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | From Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | From Supabase → Settings → API → service_role (keep secret) |

Optional (for cron jobs / features):

- `NEXT_PUBLIC_ADMIN_EMAIL` = `compliance@cu.app`
- `UNSPLASH_ACCESS_KEY` (if you use state photos cron)

Apply to **Production** (and Preview if you want).

---

## 3. Add cu.app domain in Vercel

1. In the project: **Settings** → **Domains**.
2. Add domain: **cu.app** (and optionally **www.cu.app**).
3. Vercel will show DNS instructions. You’ll do one of:
   - **Recommended:** Use Vercel nameservers (change at GoDaddy to point the whole domain to Vercel), or  
   - **CNAME / A:** Point `cu.app` and/or `www.cu.app` to Vercel at GoDaddy.

### If you use Vercel nameservers (simplest)

1. In Vercel **Domains** for this project, add **cu.app**.
2. Vercel will show **Nameservers** (e.g. `ns1.vercel-dns.com`, `ns2.vercel-dns.com`).
3. In **GoDaddy**:  
   - Open your **cu.app** domain → **Manage DNS** (or **Nameservers**).  
   - Change from “GoDaddy” nameservers to **Custom** and paste Vercel’s two nameservers.  
   - Save.
4. Wait for DNS (often 5–60 minutes). Vercel will show **Valid Configuration** when it’s ready.

### If you keep GoDaddy nameservers

1. In Vercel **Domains**, add **cu.app** (and **www.cu.app** if you want).
2. Vercel will show a **CNAME** or **A** record to add.
3. In **GoDaddy** → **Manage DNS** for **cu.app**:
   - For **www**: add CNAME `www` → `cname.vercel-dns.com` (or the value Vercel shows).
   - For **apex (cu.app)**: add **A** record `@` → `76.76.21.21` (Vercel’s IP; confirm in Vercel’s DNS instructions).
4. Save and wait for DNS. Vercel will mark the domain as valid when it’s correct.

---

## 4. Deploy

- **Deploy** the project (e.g. **Deployments** → **Redeploy** or push to the connected branch).
- After the build succeeds, the app will be live at:
  - **https://cu.app** (once DNS is valid)
  - And at the default Vercel URL (e.g. `https://your-project.vercel.app`) until then.

---

## 5. Checklist

- [ ] New Vercel project created and repo (and root directory) set correctly.
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` added in Vercel.
- [ ] Domain **cu.app** added in Vercel → Domains.
- [ ] At GoDaddy: either nameservers switched to Vercel, or CNAME/A records added as Vercel instructs.
- [ ] One successful production deploy.
- [ ] Visit **https://cu.app** after DNS propagates (and ensure SSL shows as valid in Vercel).

---

## 6. Flutter MX app at /mx-app

The app serves the Flutter MX app from **public/mx-app**. That folder must be in the repo so Vercel can serve it (this project’s `.vercelignore` does not exclude `public/`). If you build the Flutter app locally, run:

```bash
cd cu-app-monorepo/cu_mx_app
flutter build web --release --base-href "/mx-app/"
# then copy build/web/* to project root public/mx-app/
```

Then commit and push so the next Vercel deploy includes the latest MX app at **https://cu.app/mx-app/**.

---

## Troubleshooting

- **Domain not resolving:** Wait longer for DNS (up to 48h); double‑check nameservers or CNAME/A at GoDaddy match Vercel’s instructions.
- **SSL / HTTPS:** Vercel provisions certs automatically once the domain is valid; no extra step on GoDaddy.
- **Build fails:** Check **Deployments** → failed deployment → **Building** logs; ensure root directory and `npm run build` are correct and env vars are set for the environment you’re deploying.
