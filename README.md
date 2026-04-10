# ⏱ Labor Tracker

A focused, mobile-first contraction timer with the 5-1-1 rule built in.

## Features

- **Start / Stop** — `onPointerUp` handler fires reliably on both touch and mouse, even during rapid taps
- **rAF-based timer** — uses `requestAnimationFrame` instead of `setInterval` so the UI stays smooth and the Stop button is never blocked
- **Undo last** — remove the most recent entry instantly
- **Smart status banner** — detects the 5-1-1 pattern and tells you when to call your midwife
- **Stats** — live average duration and frequency (last 6 contractions)
- **Full history** — time, duration, gap between contractions, frequency badge, individual delete
- **Persists** — data saved to `localStorage`, survives page refresh
- **5-1-1 guide** — always visible at the bottom

---

## Run locally

```bash
npm install
npm start
# → http://localhost:3000
```

---

## Push to GitHub

```bash
git init
git add .
git commit -m "⏱ Labor tracker"

# Create a new repo at github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/labor-tracker.git
git branch -M main
git push -u origin main
```

---

## Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `labor-tracker` GitHub repo
3. Vercel auto-detects Create React App — click **Deploy**
4. Done ✓ — every push to `main` redeploys automatically

Or via CLI:
```bash
npm i -g vercel
vercel --prod
```

---

## Why the Stop button sometimes fails (and how this is fixed)

The original version wrapped the timer in a circular element with a CSS
`pulse-ring` div sitting on top of the button in the DOM. On some
mobile browsers the animated overlay intercepted touch events before
they reached the button.

**This version fixes it three ways:**

1. **`onPointerUp` instead of `onClick`** — fires before scroll-momentum
   cancellation and isn't blocked by touch-event coalescing.
2. **No overlay elements** near the button — nothing can intercept the tap.
3. **`activeStartRef`** — a ref mirrors `activeStart` state so the stop
   handler always sees the current timestamp without being stale-closed over.
