import { useRef, useState, useEffect } from 'react'
import { HOURS, ROW_HEIGHT, BUILTIN_TAGS, DURATIONS, DUR_LABELS } from '../shared/constants'
import { hexToRgba, assignColumns, formatDur, dateKey } from '../shared/utils'

const LABEL_W = 64
const GAP = 4
const DRAG_THRESHOLD = 8
const HOVER_CARD_W = 260

export default function Timeline({ laps, customTags, currentDate, onCellClick, onEdit, onDelete, onDropLap, onChangeDuration }) {
  const timelineRef = useRef(null)
  const dragRef = useRef(null)
  const hoverTimerRef = useRef(null)
  const [ghostStyle, setGhostStyle] = useState(null)
  const [dragOverHour, setDragOverHour] = useState(null)
  const [durationPopover, setDurationPopover] = useState(null)
  const [hoverCard, setHoverCard] = useState(null) // { lap, rect }

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

  function openHoverCard(lap, e) {
    if (dragRef.current) return
    clearTimeout(hoverTimerRef.current)
    setHoverCard({ lap, rect: e.currentTarget.getBoundingClientRect() })
  }

  function closeHoverCard() {
    hoverTimerRef.current = setTimeout(() => setHoverCard(null), 120)
  }

  function startDrag(e, lap, card) {
    if (e.button !== 0) return
    if (e.target.tagName === 'BUTTON') return
    if (e.target.closest('[data-no-drag]')) return
    e.preventDefault()
    clearTimeout(hoverTimerRef.current)
    setHoverCard(null)
    const rect = card.getBoundingClientRect()
    dragRef.current = {
      lap,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false,
      cardColor: (allTags[lap.tag] || { color: '#888' }).color,
      cardRect: rect,
    }
  }

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragRef.current) return
      const { offsetX, offsetY, startX, startY, cardColor, cardRect } = dragRef.current
      if (!dragRef.current.hasMoved) {
        const dx = e.clientX - startX
        const dy = e.clientY - startY
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return
        dragRef.current.hasMoved = true
        setGhostStyle({ left: cardRect.left, top: cardRect.top, width: 280, height: 44, borderLeftColor: cardColor })
      }
      setGhostStyle(prev => prev && ({ ...prev, left: e.clientX - offsetX, top: e.clientY - offsetY }))
      setDragOverHour(getHourFromY(e.clientY))
    }
    async function onMouseUp(e) {
      if (!dragRef.current) return
      const { lap, hasMoved } = dragRef.current
      const targetHour = getHourFromY(e.clientY)
      dragRef.current = null
      setGhostStyle(null)
      setDragOverHour(null)
      if (hasMoved && targetHour !== null && lap.hour !== targetHour) {
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

  useEffect(() => {
    if (!durationPopover) return
    function handleOutside(e) {
      if (!e.target.closest('[data-popover]')) setDurationPopover(null)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [durationPopover])

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
        const isCompact = totalCols >= 2
        const top = (lap.hour - HOURS[0]) * ROW_HEIGHT + 2
        const height = Math.max((lap.duration / 60) * ROW_HEIGHT - 4, 24)

        return (
          <div
            key={lap.id}
            onMouseDown={e => startDrag(e, lap, e.currentTarget)}
            onMouseEnter={isCompact ? e => openHoverCard(lap, e) : undefined}
            onMouseLeave={isCompact ? closeHoverCard : undefined}
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
              padding: isCompact ? '0 8px' : '0 14px',
              display: 'flex',
              alignItems: 'center',
              gap: isCompact ? 6 : 10,
              cursor: 'grab',
              userSelect: 'none',
              overflow: 'hidden',
              boxSizing: 'border-box',
              zIndex: 3,
              opacity: isDragging ? 0.35 : 1,
              transition: 'background 0.12s',
            }}
            className="lap-block"
          >
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: 1,
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: 3,
              background: hexToRgba(tagDef.color, 0.12),
              color: tagDef.color,
              border: `1px solid ${tagDef.color}`,
              flexShrink: 0,
            }}>{tagDef.label}</span>

            <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lap.text}</span>

            {!isCompact && (
              <>
                <span
                  data-no-drag
                  onClick={e => {
                    e.stopPropagation()
                    const rect = e.currentTarget.getBoundingClientRect()
                    setDurationPopover(prev => prev?.lapId === lap.id ? null : { lapId: lap.id, rect })
                  }}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--accent2)', flexShrink: 0, cursor: 'pointer', borderBottom: '1px dashed var(--accent2)', paddingBottom: 1 }}
                >{formatDur(lap.duration)}</span>
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
              </>
            )}
          </div>
        )
      })}

      {/* hover card for compact laps */}
      {hoverCard && (() => {
        const { lap, rect } = hoverCard
        const tagDef = allTags[lap.tag] || { label: lap.tag, color: '#888' }
        const fitsRight = rect.right + 10 + HOVER_CARD_W <= window.innerWidth - 8
        const hPos = fitsRight ? { left: rect.right + 10 } : { right: window.innerWidth - rect.left + 10 }
        const topPos = Math.min(rect.top, window.innerHeight - 180)
        return (
          <div
            onMouseEnter={() => clearTimeout(hoverTimerRef.current)}
            onMouseLeave={closeHoverCard}
            style={{
              position: 'fixed',
              top: topPos,
              ...hPos,
              width: HOVER_CARD_W,
              background: 'var(--surface2)',
              border: `1px solid var(--border)`,
              borderLeft: `3px solid ${tagDef.color}`,
              borderRadius: '0 10px 10px 0',
              padding: '12px 14px',
              zIndex: 9998,
              boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
              pointerEvents: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
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
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--muted)' }}>
                {String(lap.hour).padStart(2, '0')}:00 · {formatDur(lap.duration)}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 10, wordBreak: 'break-all' }}>{lap.text}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span
                data-no-drag
                onClick={e => {
                  e.stopPropagation()
                  const r = e.currentTarget.getBoundingClientRect()
                  setDurationPopover(prev => prev?.lapId === lap.id ? null : { lapId: lap.id, rect: r })
                }}
                onMouseDown={e => e.stopPropagation()}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--accent2)', cursor: 'pointer', borderBottom: '1px dashed var(--accent2)', paddingBottom: 1 }}
              >시간 변경</span>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => { setHoverCard(null); onEdit(lap.id) }}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11 }}
              >수정</button>
              <button
                onClick={() => { setHoverCard(null); onDelete(lap.id) }}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11 }}
              >삭제</button>
            </div>
          </div>
        )
      })()}

      {/* duration change popover */}
      {durationPopover && (() => {
        const item = layoutItems.find(i => i.lap.id === durationPopover.lapId)
        if (!item) return null
        const { lap } = item
        const { rect } = durationPopover
        const POPOVER_W = 220
        const overflowsRight = rect.left + POPOVER_W > window.innerWidth - 8
        const hPos = overflowsRight
          ? { right: window.innerWidth - rect.right }
          : { left: rect.left }
        return (
          <div
            data-popover
            onMouseDown={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: rect.bottom + 6,
              ...hPos,
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 10px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              zIndex: 9999,
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              minWidth: POPOVER_W,
            }}
          >
            <div style={{ width: '100%', fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>소요 시간 변경</div>
            {DURATIONS.map(d => (
              <button
                key={d}
                onClick={() => { onChangeDuration(item.lap, d); setDurationPopover(null) }}
                style={{
                  background: item.lap.duration === d ? 'var(--accent)' : 'var(--surface)',
                  color: item.lap.duration === d ? '#0c0c0e' : 'var(--text)',
                  border: `1px solid ${item.lap.duration === d ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
              >{DUR_LABELS[d]}</button>
            ))}
          </div>
        )
      })()}

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
