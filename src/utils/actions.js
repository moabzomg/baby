export const ACTIONS = {
  breast_left:   { emoji: '◐', color: '#f9a8d4', bg: '#fdf2f8', key: 'breastfeedLeft',  category: 'feed',   hasTimer: true,  hasMl: false },
  breast_right:  { emoji: '◑', color: '#f9a8d4', bg: '#fdf2f8', key: 'breastfeedRight', category: 'feed',   hasTimer: true,  hasMl: false },
  breast_both:   { emoji: '◉', color: '#f9a8d4', bg: '#fdf2f8', key: 'breastfeedBoth',  category: 'feed',   hasTimer: true,  hasMl: false },
  formula:       { emoji: '🥛', color: '#93c5fd', bg: '#eff6ff', key: 'formulaMilk',     category: 'feed',   hasTimer: false, hasMl: true  },
  bottle:        { emoji: '🍼', color: '#6ee7b7', bg: '#ecfdf5', key: 'bottle',          category: 'feed',   hasTimer: false, hasMl: true  },
  sleep:         { emoji: '😴', color: '#a78bfa', bg: '#f5f3ff', key: 'sleep',           category: 'sleep',  hasTimer: true,  hasMl: false },
  wake:          { emoji: '☀️', color: '#fbbf24', bg: '#fffbeb', key: 'wake',            category: 'sleep',  hasTimer: false, hasMl: false },
  pee:           { emoji: '💧', color: '#60a5fa', bg: '#eff6ff', key: 'pee',             category: 'diaper', hasTimer: false, hasMl: false },
  poo:           { emoji: '💩', color: '#d97706', bg: '#fffbeb', key: 'poo',             category: 'diaper', hasTimer: false, hasMl: false },
  diaper:        { emoji: '🩲', color: '#86efac', bg: '#f0fdf4', key: 'changeDiaper',    category: 'diaper', hasTimer: false, hasMl: false },
  tummy:         { emoji: '🐛', color: '#f97316', bg: '#fff7ed', key: 'tummyTime',       category: 'activity',hasTimer: true, hasMl: false },
  bath:          { emoji: '🛁', color: '#38bdf8', bg: '#f0f9ff', key: 'bath',            category: 'activity',hasTimer: true, hasMl: false },
  medicine:      { emoji: '💊', color: '#f43f5e', bg: '#fff1f2', key: 'medicine',        category: 'health', hasTimer: false, hasMl: false },
  weight:        { emoji: '⚖️', color: '#8b5cf6', bg: '#f5f3ff', key: 'weight',          category: 'health', hasTimer: false, hasMl: false },
  mood:          { emoji: '😊', color: '#f59e0b', bg: '#fffbeb', key: 'mood',            category: 'health', hasTimer: false, hasMl: false },
  note:          { emoji: '📝', color: '#6b7280', bg: '#f9fafb', key: 'note',            category: 'other',  hasTimer: false, hasMl: false },
};

export const ACTION_GROUPS = [
  { key: 'feed',     labelZh: '餵食', labelEn: 'Feeding',   actions: ['breast_left','breast_right','breast_both','formula','bottle'] },
  { key: 'sleep',    labelZh: '睡眠', labelEn: 'Sleep',     actions: ['sleep','wake'] },
  { key: 'diaper',   labelZh: '尿片', labelEn: 'Diaper',    actions: ['pee','poo','diaper'] },
  { key: 'activity', labelZh: '活動', labelEn: 'Activity',  actions: ['tummy','bath'] },
  { key: 'health',   labelZh: '健康', labelEn: 'Health',    actions: ['medicine','weight','mood'] },
  { key: 'other',    labelZh: '其他', labelEn: 'Other',     actions: ['note'] },
];

export const MOOD_OPTIONS = [
  { id: 'happy',   emoji: '😄', zh: '開心',  en: 'Happy'   },
  { id: 'neutral', emoji: '😐', zh: '一般',  en: 'Neutral' },
  { id: 'fussy',   emoji: '😣', zh: '煩躁',  en: 'Fussy'   },
  { id: 'crying',  emoji: '😢', zh: '哭鬧',  en: 'Crying'  },
];

export const FEED_ACTIONS = ['breast_left','breast_right','breast_both','formula','bottle'];
export const SLEEP_ACTIONS = ['sleep','wake'];
export const DIAPER_ACTIONS = ['pee','poo','diaper'];
