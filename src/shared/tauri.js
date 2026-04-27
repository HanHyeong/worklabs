export function invoke(cmd, args = {}) {
  return window.__TAURI__
    ? window.__TAURI__.core.invoke(cmd, args)
    : Promise.resolve(cmd.startsWith('get') ? [] : null)
}

export function emit(event, payload = {}) {
  if (window.__TAURI__) window.__TAURI__.event.emit(event, payload)
}

export function listen(event, handler) {
  if (!window.__TAURI__) return () => {}
  let unlisten
  window.__TAURI__.event.listen(event, handler).then(fn => { unlisten = fn })
  return () => unlisten?.()
}
