import { useState, useCallback } from 'react'
import { invoke, emit } from '../shared/tauri'

export function useCustomTags() {
  const [customTags, setCustomTags] = useState({})

  const reload = useCallback(async () => {
    const rows = await invoke('get_custom_tags')
    const map = {}
    rows.forEach(t => { map[t.id] = { label: t.label, color: t.color } })
    setCustomTags(map)
  }, [])

  const create = useCallback(async (id, label, color) => {
    await invoke('upsert_custom_tag', { tag: { id, label, color } })
    setCustomTags(prev => ({ ...prev, [id]: { label, color } }))
    emit('tags-updated', {})
  }, [])

  const remove = useCallback(async (key) => {
    await invoke('delete_custom_tag', { id: key })
    setCustomTags(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    emit('tags-updated', {})
  }, [])

  return { customTags, reload, createTag: create, deleteTag: remove }
}
