import { useState } from 'react'
import { hexToRgba, nextCustomColor } from './utils'
import { BUILTIN_TAGS, CUSTOM_PALETTE } from './constants'

export default function TagPicker({ customTags, selectedTag, onSelect, onCreate, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [inputVal, setInputVal] = useState('')

  const allTags = { ...BUILTIN_TAGS, ...customTags }

  function commitNew() {
    const label = inputVal.trim()
    if (label) {
      const id = 'custom_' + Date.now()
      const color = nextCustomColor(customTags, CUSTOM_PALETTE)
      onCreate(id, label, color)
    }
    setAdding(false)
    setInputVal('')
  }

  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {Object.entries(allTags).map(([key, tag]) => (
        <div key={key} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <div
            onClick={() => onSelect(key)}
            style={{
              padding: '3px 10px',
              borderRadius: 4,
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: 1,
              textTransform: 'uppercase',
              cursor: 'pointer',
              border: `1px solid ${tag.color}`,
              background: hexToRgba(tag.color, 0.12),
              color: tag.color,
              opacity: selectedTag === key ? 1 : 0.45,
              transition: 'all 0.12s',
            }}
          >
            {tag.label}
          </div>
          {!tag.builtin && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(key) }}
              style={{
                position: 'absolute',
                top: -5, right: -5,
                width: 14, height: 14,
                borderRadius: '50%',
                background: 'var(--danger)',
                color: '#fff',
                fontSize: 9,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >×</button>
          )}
        </div>
      ))}

      {adding ? (
        <input
          autoFocus
          maxLength={8}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitNew() }
            if (e.key === 'Escape') { setAdding(false); setInputVal('') }
          }}
          onBlur={() => setTimeout(() => { commitNew() }, 150)}
          placeholder="이름 입력..."
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--accent)',
            color: 'var(--text)',
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: 11,
            padding: '3px 7px',
            borderRadius: 4,
            outline: 'none',
            width: 80,
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            padding: '3px 8px',
            borderRadius: 4,
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            letterSpacing: 1,
            cursor: 'pointer',
            border: '1px dashed var(--border)',
            color: 'var(--muted)',
            background: 'transparent',
          }}
        >+ 추가</button>
      )}
    </div>
  )
}
