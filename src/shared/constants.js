export const HOURS = Array.from({ length: 16 }, (_, i) => i + 7)
export const ROW_HEIGHT = 60

export const BUILTIN_TAGS = {
  work:    { label: '업무', color: '#c8f135', builtin: true },
  meeting: { label: '미팅', color: '#35f1a8', builtin: true },
  break:   { label: '휴식', color: '#f1a835', builtin: true },
  study:   { label: '학습', color: '#35a8f1', builtin: true },
  etc:     { label: '기타', color: '#f135c8', builtin: true },
}

export const CUSTOM_PALETTE = [
  '#e879f9','#fb923c','#a78bfa','#f472b6','#34d399',
  '#60a5fa','#fbbf24','#f87171','#4ade80','#38bdf8',
]
