import { useState, useEffect, useRef } from 'react'
import { HOURS, BUILTIN_TAGS } from '../shared/constants'
import { dateKey } from '../shared/utils'
import { invoke, emit, listen } from '../shared/tauri'
import TagPicker from '../shared/TagPicker'
import { nextCustomColor, hexToRgba } from '../shared/utils'
import { CUSTOM_PALETTE } from '../shared/constants'

const DURATIONS = [30, 60, 90, 120, 180, 240]
const DUR_LABELS = { 30: '30분', 60: '1시간', 90: '1시간 30분', 120: '2시간', 180: '3시간', 240: '4시간' }

export default function QuickAdd() {
  const [text, setText] = useState('')
  const [selectedTag, setSelectedTag] = useState('work')
  const [hour, setHour] = useState(Math.max(7, Math.min(22, new Date().getHours())))
  const [duration, setDuration] = useState(60)
  const [customTags, setCustomTags] = useState({})
  const everFocused = useRef(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    async function loadTags() {
      const rows = await invoke('get_custom_tags')
      const map = {}
      rows.forEach(t => { map[t.id] = { label: t.label, color: t.color } })
      setCustomTags(map)
    }
    loadTags()
    const unlisten = listen('tags-updated', loadTags)
    return unlisten
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') hidePanel()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveAndClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [text, selectedTag, hour, duration])

  useEffect(() => {
    function onFocus() {
      everFocused.current = true
      textareaRef.current?.focus()
    }
    function onBlur() {
      if (!everFocused.current) return
      setTimeout(() => {
        if (!document.hasFocus()) hidePanel()
      }, 150)
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  function hidePanel() {
    setText('')
    setSelectedTag('work')
    setHour(Math.max(7, Math.min(22, new Date().getHours())))
    setDuration(60)
    invoke('hide_quick_add')
  }

  async function saveAndClose() {
    const trimmed = text.trim()
    if (!trimmed) { textareaRef.current?.focus(); return }
    const lap = {
      id: Date.now().toString(),
      date: dateKey(new Date()),
      hour,
      duration,
      tag: selectedTag,
      text: trimmed,
    }
    await invoke('upsert_lap', { lap })
    emit('lap-added', {})
    hidePanel()
  }

  async function handleCreateTag(id, label, color) {
    await invoke('upsert_custom_tag', { tag: { id, label, color } })
    setCustomTags(prev => ({ ...prev, [id]: { label, color } }))
    setSelectedTag(id)
  }

  async function handleDeleteTag(key) {
    if (selectedTag === key) setSelectedTag('work')
    await invoke('delete_custom_tag', { id: key })
    setCustomTags(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      padding: '20px 20px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', WebkitAppRegion: 'drag', appRegion: 'drag', flexShrink: 0 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3, color: 'var(--accent)' }}>QUICK LAP</div>
        <button
          onClick={hidePanel}
          style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✕</button>
      </div>

      <TagPicker
        customTags={customTags}
        selectedTag={selectedTag}
        onSelect={setSelectedTag}
        onCreate={handleCreateTag}
        onDelete={handleDeleteTag}
      />

      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="어떤 업무를 했나요?"
        style={{
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: 13,
          padding: '10px 12px',
          borderRadius: 8,
          outline: 'none',
          resize: 'none',
          flex: 1,
          minHeight: 72,
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flexShrink: 0 }}>
        {[
          { label: '시작 시간', id: 'hour', value: hour, onChange: e => setHour(Number(e.target.value)), options: HOURS.map(h => ({ value: h, label: `${String(h).padStart(2, '0')}:00` })) },
          { label: '소요 시간', id: 'dur', value: duration, onChange: e => setDuration(Number(e.target.value)), options: DURATIONS.map(d => ({ value: d, label: DUR_LABELS[d] })) },
        ].map(({ label, id, value, onChange, options }) => (
          <div key={id}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{label}</div>
            <select value={value} onChange={onChange} style={selectStyle}>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
      </div>

      <button onClick={saveAndClose} style={{ width: '100%', background: 'var(--accent)', color: '#0c0c0e', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: 1.5, textTransform: 'uppercase', padding: 11, borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
        저장하기
      </button>
    </div>
  )
}

const selectStyle = {
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontFamily: "'Noto Sans KR', sans-serif",
  fontSize: 13,
  padding: '8px 32px 8px 10px',
  borderRadius: 8,
  outline: 'none',
  cursor: 'pointer',
  WebkitAppearance: 'none',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235a5a6a' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
}
