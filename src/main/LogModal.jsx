import { useState } from 'react'
import { BUILTIN_TAGS } from '../shared/constants'
import { hexToRgba, formatDur, formatDate, dateKey } from '../shared/utils'

export default function LogModal({ open, laps, customTags, date, onClose }) {
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const allTags = { ...BUILTIN_TAGS, ...customTags }
  const sorted = [...laps].sort((a, b) => a.hour - b.hour)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} (${days[date.getDay()]})`

  function buildText() {
    if (!sorted.length) return ''
    const lines = [`${dateStr} 업무 기록`, '─'.repeat(40)]
    sorted.forEach(lap => {
      const tag = allTags[lap.tag] || { label: lap.tag }
      lines.push(`${String(lap.hour).padStart(2, '0')}:00  [${tag.label}]  ${lap.text}  (${formatDur(lap.duration)})`)
    })
    return lines.join('\n')
  }

  function copyLog() {
    const text = buildText()
    if (!text) return
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 32,
        width: '100%',
        maxWidth: 520,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 3, color: 'var(--accent)' }}>오늘 기록</div>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>닫기</button>
        </div>

        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, flexShrink: 0 }}>
          {dateStr}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, marginBottom: 20 }}>
          {sorted.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 1, padding: '32px 0' }}>
              오늘 기록된 랩이 없습니다.
            </div>
          ) : sorted.map(lap => {
            const tag = allTags[lap.tag] || { label: lap.tag, color: '#888' }
            return (
              <div key={lap.id} style={{ display: 'grid', gridTemplateColumns: '52px auto 1fr auto', alignItems: 'baseline', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>{String(lap.hour).padStart(2, '0')}:00</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 3, background: hexToRgba(tag.color, 0.12), color: tag.color, border: `1px solid ${tag.color}` }}>{tag.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{lap.text}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDur(lap.duration)}</span>
              </div>
            )
          })}
        </div>

        <button
          onClick={copyLog}
          style={{
            width: '100%',
            background: copied ? 'var(--accent)' : 'var(--accent2)',
            color: '#0c0c0e',
            border: 'none',
            fontFamily: "'DM Mono', monospace",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 1,
            textTransform: 'uppercase',
            padding: 12,
            borderRadius: 8,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >{copied ? '복사 완료!' : '텍스트로 복사'}</button>
      </div>
    </div>
  )
}
