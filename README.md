# 寶寶日記 · Baby Diary

A full-featured bilingual (Cantonese / English) baby tracking app. Default language: 粵語.

## Features

### 👶 Baby Log (after birth)
- 16 trackable actions with emoji + colour coding
- **Feeding**: Left/Right/Both breast, Formula, Bottle — with live timer or manual ml entry
- **Sleep/Wake**: live timer, daily total hours
- **Diaper**: Pee 💧, Poo 💩, Change 🩲
- **Activities**: Tummy time, Bath — with timer
- **Health**: Medicine, Weight (g), Mood (happy/neutral/fussy/crying)
- **Notes**: free-text diary entries
- Age-aware feeding guide (0–12+ months, 8 stages)
- Gap alert banner (adjusts thresholds per age)
- Today's summary stats (feeds, ml, sleep, diapers)

### 📅 Diary
- **Left panel**: Monthly calendar with activity dot indicators and emoji previews
- **Right panel**: Day timeline with all entries
- Day / Month / Year view switcher
- Day summary chips (count per category, total ml, total sleep hours)
- Delete individual entries

### 📊 Analysis
- 7-day and 30-day range toggle
- **Charts**: Feeding count, Milk ml, Sleep hours, Diaper changes (custom bar charts)
- **Weight trend** visualisation
- **Activity breakdown** horizontal bars
- Summary averages (feeds/day, sleep hours, diapers/day, avg ml)
- **Export CSV** and **Export JSON**

### ⏱ Labor Tracker (pre-birth & always accessible)
- Reliable `onPointerUp` stop button (no blocked taps on mobile)
- 5-1-1 rule auto-detection with colour-coded banners
- Average duration / frequency stats
- Full history with gap and frequency per entry
- Undo last, delete individual, clear all

### ⚙️ Settings
- **Language toggle**: 粵語 ↔ English (also accessible via header button)
- Edit baby name, birthday / due date, born/not-born status
- Clear all data

## Run locally

```bash
npm install
npm start
# → http://localhost:3000
```

## Push to GitHub & deploy on Vercel

```bash
git init
git add .
git commit -m "寶寶日記 v2 — bilingual baby tracker"
git remote add origin https://github.com/YOUR_USERNAME/baby-diary.git
git push -u origin main
```

Then: vercel.com → Add New Project → Import repo → Deploy.
Every push to `main` redeploys automatically.
