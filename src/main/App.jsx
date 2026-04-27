import { useState, useEffect, useCallback } from 'react'
import { listen } from '../shared/tauri'
import { dateKey, formatDate } from '../shared/utils'
import { useLaps } from './useLaps'
import { useCustomTags } from './useCustomTags'
import Timeline from './Timeline'
import LapModal from './LapModal'
import LogModal from './LogModal'

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [modal, setModal] = useState({ open: false, editLap: null, defaultHour: null })
  const [logOpen, setLogOpen] = useState(false)

  const { laps, reload: reloadLaps, upsert, remove } = useLaps(currentDate)
  const { customTags, reload: reloadTags, createTag, deleteTag } = useCustomTags()

  useEffect(() => {
    Promise.all([reloadTags(), reloadLaps(currentDate)]).then(() => {
      if (window.__TAURI__) window.__TAURI__.window.getCurrentWindow().show()
    })
  }, [])

  useEffect(() => {
    reloadLaps(currentDate)
  }, [currentDate])

  useEffect(() => {
    const unlisten = listen('lap-added', async () => {
      if (dateKey(currentDate) === dateKey(new Date())) {
        await reloadLaps(currentDate)
      }
    })
    return unlisten
  }, [currentDate])

  useEffect(() => {
    const unlisten = listen('tags-updated', () => reloadTags())
    return unlisten
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { setModal(m => ({ ...m, open: false })); setLogOpen(false) }
      if (e.key === 'n' && !modal.open && !logOpen) openModal()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modal.open, logOpen])

  function openModal(hour) {
    setModal({ open: true, editLap: null, defaultHour: hour ?? null })
  }

  function openEditModal(id) {
    const lap = laps.find(t => t.id === id)
    if (lap) setModal({ open: true, editLap: lap, defaultHour: null })
  }

  async function handleSave({ text, tag, hour, duration }) {
    const lap = {
      id: modal.editLap?.id || Date.now().toString(),
      date: dateKey(currentDate),
      hour,
      duration,
      tag,
      text,
    }
    await upsert(lap)
    await reloadLaps(currentDate)
    setModal(m => ({ ...m, open: false }))
  }

  async function handleDrop(lap, targetHour) {
    await upsert({ ...lap, hour: targetHour })
    await reloadLaps(currentDate)
  }

  async function changeDay(delta) {
    setCurrentDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + delta)
      return d
    })
  }

  const now = new Date()
  const todayKey = dateKey(now)
  const isToday = dateKey(currentDate) === todayKey

  const totalMins = laps.reduce((s, t) => s + t.duration, 0)
  const focusMins = laps.filter(t => t.tag !== 'break').reduce((s, t) => s + t.duration, 0)
  const totalHoursStr = totalMins >= 60 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m` : `${totalMins}m`
  const focusRate = totalMins > 0 ? Math.round(focusMins / totalMins * 100) + '%' : '—'
  const dayProgress = isToday
    ? Math.min(100, ((now.getHours() - 7) / 15) * 100)
    : dateKey(currentDate) < todayKey ? 100 : 0

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 28, WebkitAppRegion: 'drag', appRegion: 'drag', zIndex: 200 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 48, marginTop: 8 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, letterSpacing: 4, color: 'var(--accent)', lineHeight: 1, textShadow: '0 0 40px rgba(200,241,53,0.3)' }}>
            WORK<span style={{ color: 'var(--muted)' }}>LAPS</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
              하루를 랩으로 기록하다
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: 1, opacity: 0.6 }}>
              v{__APP_VERSION__}
            </div>
          </div>
        </header>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => changeDay(-1)} style={navBtnStyle}>‹</button>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--text)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: 6, minWidth: 130, textAlign: 'center' }}>
              {formatDate(currentDate)}
            </div>
            <button onClick={() => changeDay(1)} style={navBtnStyle}>›</button>
          </div>
          <button onClick={() => { setCurrentDate(new Date()) }} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>오늘</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { label: '총 업무 시간', value: totalHoursStr, color: 'var(--accent)' },
            { label: '기록된 랩', value: laps.length, color: 'var(--accent2)' },
            { label: '집중률', value: focusRate, color: 'var(--text)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 2, lineHeight: 1, color }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ height: '100%', width: `${dayProgress}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))', borderRadius: 2, transition: 'width 0.5s ease' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>// 타임라인</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setLogOpen(true)} style={{ background: 'rgba(53,241,168,0.1)', border: '1px solid var(--accent2)', color: 'var(--accent2)', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>오늘 기록 보기</button>
            <button onClick={() => openModal()} style={{ background: 'var(--accent)', color: '#0c0c0e', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>+</span> 랩 추가
            </button>
          </div>
        </div>

        <Timeline
          laps={laps}
          customTags={customTags}
          currentDate={currentDate}
          onCellClick={h => openModal(h)}
          onEdit={openEditModal}
          onDelete={remove}
          onDropLap={handleDrop}
        />
      </div>

      <LapModal
        open={modal.open}
        editLap={modal.editLap}
        defaultHour={modal.defaultHour}
        customTags={customTags}
        onSave={handleSave}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        onCreateTag={createTag}
        onDeleteTag={deleteTag}
      />

      <LogModal
        open={logOpen}
        laps={laps}
        customTags={customTags}
        date={currentDate}
        onClose={() => setLogOpen(false)}
      />
    </>
  )
}

const navBtnStyle = {
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  color: 'var(--muted)',
  width: 32,
  height: 32,
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
