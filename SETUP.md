# FoodGuard — Setup Notes

## What's in this folder
- `index.html` — the whole app: landing page, login/signup, dashboard, scanning,
  160 recipes, the 14-topic allergy education library, pricing, get help,
  settings and legal pages.
- `netlify/functions/scan.js` — a small server-side function that talks to
  Claude on your behalf when someone scans a photo. This is what keeps your
  API key private and safe, instead of it living inside the app.

## To preview the design only (no photo scanning)
Just drag this whole folder onto app.netlify.com/drop. Everything works
except the "check this food" photo button — barcode scanning, the 160
recipes, the allergy checker, and the education library all work immediately
because they don't need your key.

## To turn on real photo scanning (two steps, one time only)
1. Get a key: go to console.anthropic.com, sign in, and create an API key.
   This is a paid service — you add credit and each scan uses a small amount.
2. Add it to Netlify: open your site on app.netlify.com, go to
   **Site configuration → Environment variables**, and add one:
   - Key: `ANTHROPIC_API_KEY`
   - Value: (paste your key)
   Then redeploy the site (Netlify usually prompts you, or trigger it from
   Deploys → Trigger deploy).

That's it — the app will now call your function, your function will call
Claude, and photo scanning will work for every visitor without any of them
needing a key of their own.

## Important before real customers use this
This is a working demo, not yet a production backend:
- Family profiles and login are stored in the browser's memory only —
  they're lost on refresh. Before launch, this needs a real database
  (Firebase, Supabase, or similar) so accounts persist.
- There's no payment processing yet — the Pricing page buttons are
  placeholders ("Payments coming soon").
- There's no limit yet on free vs paid scans.
- Anthropic API costs scale with usage — keep an eye on your usage on
  console.anthropic.com, especially once real users are scanning photos.

None of this affects how the app looks or feels — it's about what needs to
be added underneath before opening it up to the public.
