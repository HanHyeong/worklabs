export function dateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDate(d) {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`
}

export function formatDur(mins) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function nextCustomColor(customTags, palette) {
  const used = Object.values(customTags).map(t => t.color)
  for (const c of palette) {
    if (!used.includes(c)) return c
  }
  return palette[Object.keys(customTags).length % palette.length]
}

// Gantt overlap column assignment
export function assignColumns(laps) {
  const items = laps.map(lap => ({ lap, col: 0 }))
  const cols = []
  for (const item of items) {
    const end = item.lap.hour + item.lap.duration / 60
    let placed = false
    for (let ci = 0; ci < cols.length; ci++) {
      const overlaps = cols[ci].some(
        l => item.lap.hour < l.hour + l.duration / 60 && end > l.hour
      )
      if (!overlaps) { cols[ci].push(item.lap); item.col = ci; placed = true; break }
    }
    if (!placed) { cols.push([item.lap]); item.col = cols.length - 1 }
  }
  return items.map(item => {
    const end = item.lap.hour + item.lap.duration / 60
    const totalCols = items.filter(o =>
      item.lap.hour < o.lap.hour + o.lap.duration / 60 && end > o.lap.hour
    ).length
    return { ...item, totalCols }
  })
}
