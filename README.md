# 🌸 Baby Prep — Pregnancy Companion App

A beautiful, mobile-first React app to help you and your partner prepare for your baby's arrival.

## ✨ Features

| Feature | Description |
|---|---|
| 🏠 **Dashboard** | Countdown to due date, week/trimester display, daily tip |
| 🌱 **Weekly Tracker** | Week-by-week baby size, milestones & tips for all 40 weeks |
| 👶 **Kick Counter** | Track baby movements with goal progress and session history |
| ⏱️ **Labor Counter** | Time contractions with the 5-1-1 rule alert system |
| ✅ **Checklist** | Full pregnancy task list (all 3 trimesters + partner tasks) |
| 🎒 **Hospital Bag** | Packing checklist for mum, baby, and partner |

All data is stored in **localStorage** — no account needed, works offline.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 16+ installed ([download](https://nodejs.org))
- npm (comes with Node.js)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm start

# 3. Open in browser
# → http://localhost:3000
```

---

## 📦 Push to GitHub

```bash
# 1. Initialise a git repo (if not done yet)
git init

# 2. Add all files
git add .

# 3. Commit
git commit -m "🌸 Initial commit – Baby Prep app"

# 4. Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/baby-prep.git
git branch -M main
git push -u origin main
```

---

## ▲ Deploy to Vercel (linked to GitHub)

### Option A – Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `baby-prep` GitHub repository
4. Vercel auto-detects Create React App — no config needed
5. Click **Deploy** 🎉
6. Your app is live at `https://baby-prep-xxx.vercel.app`

> Every time you push to `main`, Vercel automatically redeploys!

### Option B – Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

---

## 📁 Project Structure

```
baby-prep/
├── public/
│   └── index.html          # HTML shell with Google Fonts
├── src/
│   ├── App.js              # Root component + navigation
│   ├── App.css             # Global layout + shared styles
│   ├── index.js            # React entry point
│   ├── index.css           # CSS variables + animations
│   └── pages/
│       ├── Dashboard.js    # Home screen with countdown
│       ├── Dashboard.css
│       ├── WeeklyTracker.js  # Week-by-week pregnancy info
│       ├── WeeklyTracker.css
│       ├── KickCounter.js  # Baby movement counter
│       ├── KickCounter.css
│       ├── LaborCounter.js # Contraction timer + 5-1-1
│       ├── LaborCounter.css
│       ├── Checklist.js    # Task checklist
│       ├── Checklist.css
│       ├── HospitalBag.js  # Packing list
│       └── HospitalBag.css
├── .gitignore
├── vercel.json             # Vercel config
├── package.json
└── README.md
```

---

## 🎨 Design

- **Fonts**: Playfair Display (headings) + DM Sans (body)
- **Palette**: Blush pink, sage green, soft cream
- **Mobile-first**: Max width 480px, bottom navigation
- **Animations**: Smooth fade-ins, pulse rings, micro-interactions

---

## 💕 Made with love

Built as a pregnancy companion for partners to prepare together.  
*Congratulations on your growing family!* 🌸
