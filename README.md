# ⏱ Labor Tracker + 🍼 Milk Log

A focused, mobile-first two-tab app for new parents.

## Features

### ⏱ Labor Tracker
- Start / Stop contraction timer (reliable `onPointerUp` handler — no blocked taps)
- 5-1-1 rule auto-detection with colour-coded alerts
- Live average duration and frequency stats
- Full contraction history with gap and frequency per entry
- Undo last, delete individual, clear all
- Data persists in `localStorage`

### 🍼 Milk Log
- **Feed type picker** — Left breast, Right breast, Both breasts, Bottle, Formula
- **Timed feed** — start a live timer, stop to auto-save duration
- **Manual log** — enter amount (ml), duration (min), optional note
- **Today's summary** — count, total ml, total time
- **Gap alert banner** — warns after 2 h, alerts after 3 h since last feed
- **Feed history** grouped by day with all details
- Newborn feeding reference guide built in

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
git commit -m "⏱🍼 Labor tracker + Milk log"

# Create a repo at github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/labor-tracker.git
git branch -M main
git push -u origin main
```

---

## Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Vercel auto-detects Create React App → click **Deploy**
4. Every push to `main` redeploys automatically ✓

Or via CLI:
```bash
npm i -g vercel
vercel --prod
```
