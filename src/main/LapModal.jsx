import { useState, useEffect } from 'react'
import { HOURS, BUILTIN_TAGS, DURATIONS, DUR_LABELS } from '../shared/constants'
import TagPicker from '../shared/TagPicker'

export default function LapModal({ open, editLap, defaultHour, customTags, onSave, onClose, onCreateTag, onDeleteTag }) {
  const [text, setText] = useState('')
  const [tag, setTag] = useState('work')
  const [hour, setHour] = useState(defaultHour ?? 9)
  const [duration, setDuration] = useState(60)

  useEffect(() => {
    if (!open) return
    if (editLap) {
      setText(editLap.text)
      setTag(editLap.tag)
      setHour(editLap.hour)
      setDuration(editLap.duration)
    } else {
      setText('')
      setTag('work')
      setHour(defaultHour ?? Math.max(7, Math.min(22, new Date().getHours())))
      setDuration(60)
    }
  }, [open, editLap, defaultHour])

  function handleSave() {
    const trimmed = text.trim()
    if (!trimmed) return
    onSave({ text: trimmed, tag, hour, duration })
  }

  if (!open) return null

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
        maxWidth: 440,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 3, color: 'var(--accent)', marginBottom: 24 }}>
          {editLap ? 'EDIT LAP' : 'NEW LAP'}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>카테고리</label>
          <TagPicker
            customTags={customTags}
            selectedTag={tag}
            onSelect={setTag}
            onCreate={(id, label, color) => { onCreateTag(id, label, color); setTag(id) }}
            onDelete={key => { if (tag === key) setTag('work'); onDeleteTag(key) }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>업무 내용</label>
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="어떤 업무를 했나요?"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80, userSelect: 'text', WebkitUserSelect: 'text' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>시작 시간</label>
            <select value={hour} onChange={e => setHour(Number(e.target.value))} style={selectStyle}>
              {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>소요 시간</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={selectStyle}>
              {DURATIONS.map(d => <option key={d} value={d}>{DUR_LABELS[d]}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button onClick={onClose} style={btnSecondary}>취소</button>
          <button onClick={handleSave} style={btnPrimary}>저장하기</button>
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontFamily: "'DM Mono', monospace",
  fontSize: 10,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 6,
}

const inputStyle = {
  width: '100%',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontFamily: "'Noto Sans KR', sans-serif",
  fontSize: 14,
  padding: '10px 14px',
  borderRadius: 8,
  outline: 'none',
}

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  WebkitAppearance: 'none',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235a5a6a' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 36,
}

const btnPrimary = {
  flex: 1,
  background: 'var(--accent)',
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
}

const btnSecondary = {
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  color: 'var(--muted)',
  fontFamily: "'DM Mono', monospace",
  fontSize: 12,
  letterSpacing: 1,
  textTransform: 'uppercase',
  padding: '12px 20px',
  borderRadius: 8,
  cursor: 'pointer',
}
