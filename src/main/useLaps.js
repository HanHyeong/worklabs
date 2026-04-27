import { useState, useCallback } from 'react'
import { invoke } from '../shared/tauri'
import { dateKey } from '../shared/utils'

export function useLaps(currentDate) {
  const [laps, setLaps] = useState([])

  const reload = useCallback(async (date = currentDate) => {
    const result = await invoke('get_laps', { date: dateKey(date) })
    setLaps(result)
    return result
  }, [currentDate])

  const upsert = useCallback(async (lap) => {
    await invoke('upsert_lap', { lap })
  }, [])

  const remove = useCallback(async (id) => {
    await invoke('delete_lap', { id })
    setLaps(prev => prev.filter(t => t.id !== id))
  }, [])

  return { laps, setLaps, reload, upsert, remove }
}
