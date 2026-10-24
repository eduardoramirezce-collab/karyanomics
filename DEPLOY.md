# Deploying Karyanomics

The demo URL required by the Hackachusetts submission. Karyanomics is a Next.js
app, so **Vercel** is the fastest, free host. The production build has been
verified to pass (`npx next build --webpack` → compiled successfully, 4 routes).

---

## Fastest path — Vercel (recommended, free)

You do this once; after that every push to `main` redeploys automatically.

1. Go to **[vercel.com](https://vercel.com)** and sign in **with GitHub**.
2. Click **Add New… → Project**.
3. Select the **`karyanomics`** repository.
4. Vercel auto-detects **Next.js**. Leave Framework Preset, Build Command, and
   Output Directory at their defaults.
5. **Environment variables:** none required — all external APIs the app uses are
   public, no keys needed.
6. Click **Deploy**. Wait ~2 minutes.
7. You get a public URL like `https://karyanomics.vercel.app`.

Put that URL in:
- the README (replace "Live demo: coming soon"),
- the Hackachusetts submission form (Testing / demo URL field).

The app is free and open — no login wall — which satisfies the judging/testing
requirement that the project be available "free of charge and without any
restriction."

---

## Verify locally first (optional)

```bash
npm install
npm run dev          # open http://localhost:3000
# production build check (verified passing):
npx next build --webpack
```

Visit `/patient` to load the Maya/Alex/Sam sample VCFs and the clopidogrel demo,
and `/drugs` for the medication catalog.

---

## Custom domain (optional, after the hackathon)

`*.vercel.app` is fine for judging. A custom domain (e.g. `karyanomics.com`,
~$10–15/yr) is added later under **Vercel → Project → Settings → Domains**.
Skip until after the demo.

---

## Why Vercel and not static S3

The project plans server routes (`/api/drug`, `/api/npi`). Those need a host that
runs server code — Vercel, Netlify, and AWS Amplify all do; plain S3 static
hosting does not. Vercel is made by the Next.js team and needs no configuration
for this app.

## Alternatives

| Host | Cost to start | Note |
|---|---|---|
| **Vercel** | Free | Zero-config for Next.js. Recommended. |
| Netlify | Free | Works; some Next features need config. |
| Cloudflare Pages | Free | Cheap at scale; Next setup is fiddlier. |
| AWS Amplify | Pay-as-you-go | Good if you standardize on AWS. |
