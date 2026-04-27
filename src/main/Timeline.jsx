import { useRef, useState, useEffect } from 'react'
import { HOURS, ROW_HEIGHT, BUILTIN_TAGS } from '../shared/constants'
import { hexToRgba, assignColumns, formatDur, dateKey } from '../shared/utils'

const LABEL_W = 64
const GAP = 4

export default function Timeline({ laps, customTags, currentDate, onCellClick, onEdit, onDelete, onDropLap }) {
  const timelineRef = useRef(null)
  const dragRef = useRef(null)
  const [ghostStyle, setGhostStyle] = useState(null)
  const [dragOverHour, setDragOverHour] = useState(null)

  const now = new Date()
  const todayKey = dateKey(now)
  const isToday = dateKey(currentDate) === todayKey
  const allTags = { ...BUILTIN_TAGS, ...customTags }
  const totalH = HOURS.length * ROW_HEIGHT

  function getHourFromY(clientY) {
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect) return null
    const relY = clientY - rect.top
    if (relY < 0 || relY > rect.height) return null
    const idx = Math.floor(relY / ROW_HEIGHT)
    return HOURS[Math.min(Math.max(idx, 0), HOURS.length - 1)]
  }

  function startDrag(e, lap, card) {
    if (e.button !== 0) return
    if (e.target.tagName === 'BUTTON') return
    e.preventDefault()
    const rect = card.getBoundingClientRect()
    dragRef.current = {
      lap,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    }
    setGhostStyle({
      left: rect.left,
      top: rect.top,
      width: 280,
      height: 44,
      borderLeftColor: (allTags[lap.tag] || { color: '#888' }).color,
    })
  }

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragRef.current) return
      const { offsetX, offsetY } = dragRef.current
      setGhostStyle(prev => prev && ({ ...prev, left: e.clientX - offsetX, top: e.clientY - offsetY }))
      setDragOverHour(getHourFromY(e.clientY))
    }
    async function onMouseUp(e) {
      if (!dragRef.current) return
      const { lap } = dragRef.current
      const targetHour = getHourFromY(e.clientY)
      dragRef.current = null
      setGhostStyle(null)
      setDragOverHour(null)
      if (targetHour !== null && lap.hour !== targetHour) {
        await onDropLap(lap, targetHour)
      }
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onDropLap])

  const layoutItems = assignColumns(laps)
  return (
    <div style={{ position: 'relative', height: totalH }} ref={timelineRef}>
      {HOURS.map((h, idx) => {
        const isCurrent = isToday && now.getHours() === h
        const hasCoverage = laps.some(t => t.hour <= h && t.hour + t.duration / 60 > h)
        const topPx = idx * ROW_HEIGHT

        return (
          <div key={h}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: topPx, height: 1, background: 'var(--border)', pointerEvents: 'none' }} />
            <div
              style={{
                position: 'absolute',
                width: 56,
                top: topPx,
                height: ROW_HEIGHT,
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: isCurrent ? 'var(--accent)' : 'var(--muted)',
                textAlign: 'right',
                borderRight: '1px solid var(--border)',
                padding: '8px 12px 0 4px',
                boxSizing: 'border-box',
              }}
            >{String(h).padStart(2, '0')}</div>
            <div
              style={{
                position: 'absolute',
                left: 55,
                top: topPx + ROW_HEIGHT / 2,
                width: isCurrent ? 8 : 6,
                height: isCurrent ? 8 : 6,
                borderRadius: '50%',
                background: (isCurrent || hasCoverage) ? 'var(--accent)' : 'var(--border)',
                boxShadow: isCurrent ? '0 0 10px rgba(200,241,53,0.8)' : hasCoverage ? '0 0 8px rgba(200,241,53,0.5)' : 'none',
                transform: 'translateX(-50%) translateY(-50%)',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
            <div
              data-hour={h}
              onClick={() => onCellClick(h)}
              style={{
                position: 'absolute',
                left: 56, right: 0,
                top: topPx,
                height: ROW_HEIGHT,
                cursor: 'pointer',
                background: dragOverHour === h ? 'rgba(200,241,53,0.05)' : 'transparent',
                outline: dragOverHour === h ? '1px dashed rgba(200,241,53,0.5)' : 'none',
                outlineOffset: -2,
                transition: 'background 0.15s',
              }}
            />
          </div>
        )
      })}

      <div style={{ position: 'absolute', left: 0, right: 0, top: totalH, height: 1, background: 'var(--border)', pointerEvents: 'none' }} />


      {layoutItems.map(({ lap, col, totalCols }) => {
        const tagDef = allTags[lap.tag] || { label: lap.tag, color: '#888' }
        const isDragging = dragRef.current?.lap?.id === lap.id
        const top = (lap.hour - HOURS[0]) * ROW_HEIGHT + 2
        const height = Math.max((lap.duration / 60) * ROW_HEIGHT - 4, 24)

        return (
          <div
            key={lap.id}
            onMouseDown={e => startDrag(e, lap, e.currentTarget)}
            style={{
              position: 'absolute',
              top,
              height,
              left: `calc(${LABEL_W + GAP}px + ${col / totalCols} * (100% - ${LABEL_W}px))`,
              width: `calc((100% - ${LABEL_W}px) / ${totalCols} - ${GAP * 2}px)`,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${tagDef.color}`,
              borderRadius: '0 8px 8px 0',
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'grab',
              userSelect: 'none',
              overflow: 'hidden',
              boxSizing: 'border-box',
              zIndex: 3,
              opacity: isDragging ? 0.35 : 1,
            }}
            className="lap-block"
          >
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: 1,
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 3,
              background: hexToRgba(tagDef.color, 0.12),
              color: tagDef.color,
              border: `1px solid ${tagDef.color}`,
              flexShrink: 0,
            }}>{tagDef.label}</span>
            <span style={{ fontSize: 13, color: 'var(--text)', flex: 1, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lap.text}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{formatDur(lap.duration)}</span>
            <div className="task-actions" style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                title="수정"
                onClick={e => { e.stopPropagation(); onEdit(lap.id) }}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✎</button>
              <button
                title="삭제"
                onClick={e => { e.stopPropagation(); onDelete(lap.id) }}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
          </div>
        )
      })}

      {ghostStyle && (
        <div style={{
          position: 'fixed',
          pointerEvents: 'none',
          opacity: 0.88,
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${ghostStyle.borderLeftColor}`,
          borderRadius: '0 8px 8px 0',
          left: ghostStyle.left,
          top: ghostStyle.top,
          width: ghostStyle.width,
          height: ghostStyle.height,
        }} />
      )}
    </div>
  )
}
