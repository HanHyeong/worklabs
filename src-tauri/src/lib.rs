use std::sync::Mutex;
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State, WindowEvent,
};
use tauri::LogicalPosition;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

// ── 모델 ────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Lap {
    id: String,
    date: String,
    hour: i64,
    duration: i64,
    tag: String,
    text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CustomTag {
    id: String,
    label: String,
    color: String,
}

struct DbState(Mutex<Connection>);

// ── 커맨드 ───────────────────────────────────────────────────

#[tauri::command]
fn hide_quick_add(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("quick-add") {
        let _ = w.hide();
    }
}

#[tauri::command]
fn get_laps(state: State<DbState>, date: String) -> Result<Vec<Lap>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, date, hour, duration, tag, text FROM laps WHERE date = ?1 ORDER BY hour")
        .map_err(|e| e.to_string())?;
    let result = stmt.query_map(params![date], |row| {
        Ok(Lap {
            id: row.get(0)?,
            date: row.get(1)?,
            hour: row.get(2)?,
            duration: row.get(3)?,
            tag: row.get(4)?,
            text: row.get(5)?,
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string());
    result
}

#[tauri::command]
fn upsert_lap(state: State<DbState>, lap: Lap) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO laps (id, date, hour, duration, tag, text)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![lap.id, lap.date, lap.hour, lap.duration, lap.tag, lap.text],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_lap(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM laps WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_custom_tags(state: State<DbState>) -> Result<Vec<CustomTag>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, label, color FROM custom_tags")
        .map_err(|e| e.to_string())?;
    let result = stmt.query_map([], |row| {
        Ok(CustomTag {
            id: row.get(0)?,
            label: row.get(1)?,
            color: row.get(2)?,
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string());
    result
}

#[tauri::command]
fn upsert_custom_tag(state: State<DbState>, tag: CustomTag) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO custom_tags (id, label, color) VALUES (?1, ?2, ?3)",
        params![tag.id, tag.label, tag.color],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_custom_tag(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM custom_tags WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── 진입점 ───────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            hide_quick_add,
            get_laps,
            upsert_lap,
            delete_lap,
            get_custom_tags,
            upsert_custom_tag,
            delete_custom_tag,
        ])
        .setup(|app| {
            // SQLite 초기화 (구 경로 com.worklaps.app → 신 경로 com.worklaps.desktop 마이그레이션)
            let db_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&db_dir)?;
            let db_path = db_dir.join("worklaps.db");
            if !db_path.exists() {
                if let Some(parent) = db_dir.parent() {
                    let old_path = parent.join("com.worklaps.app").join("worklaps.db");
                    if old_path.exists() {
                        let _ = std::fs::copy(&old_path, &db_path);
                    }
                }
            }
            let conn = Connection::open(&db_path).expect("DB 열기 실패");
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS laps (
                    id       TEXT PRIMARY KEY,
                    date     TEXT NOT NULL,
                    hour     INTEGER NOT NULL,
                    duration INTEGER NOT NULL,
                    tag      TEXT NOT NULL,
                    text     TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS custom_tags (
                    id    TEXT PRIMARY KEY,
                    label TEXT NOT NULL,
                    color TEXT NOT NULL
                );",
            )
            .expect("테이블 생성 실패");
            app.manage(DbState(Mutex::new(conn)));

            // 메인 창: 닫기 버튼 → 숨기기
            let h1 = app.handle().clone();
            app.get_webview_window("main")
                .unwrap()
                .on_window_event(move |e| {
                    if let WindowEvent::CloseRequested { api, .. } = e {
                        api.prevent_close();
                        let _ = h1.get_webview_window("main").unwrap().hide();
                    }
                });

            // 퀵애드 창: 시작 시 화면 밖으로 배치 (첫 show() 전 깜빡임 방지)
            if let Some(popup) = app.get_webview_window("quick-add") {
                let _ = popup.set_position(LogicalPosition::new(-10000.0_f64, -10000.0_f64));
            }

            // 퀵애드 창: 닫기 요청 → 숨기기
            let h2 = app.handle().clone();
            app.get_webview_window("quick-add")
                .unwrap()
                .on_window_event(move |e| {
                    if let WindowEvent::CloseRequested { api, .. } = e {
                        api.prevent_close();
                        let _ = h2.get_webview_window("quick-add").unwrap().hide();
                    }
                });

            // 글로벌 단축키 macOS: Cmd+Shift+L, Windows/Linux: Ctrl+Shift+L → 퀵애드 토글
            let modifier = if cfg!(target_os = "macos") {
                Modifiers::SUPER | Modifiers::SHIFT
            } else {
                Modifiers::CONTROL | Modifiers::SHIFT
            };
            let shortcut = Shortcut::new(Some(modifier), Code::KeyL);
            app.global_shortcut().on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    if let Some(popup) = app.get_webview_window("quick-add") {
                        if popup.is_visible().unwrap_or(false) {
                            let _ = popup.hide();
                            return;
                        }
                        // 현재 마우스 위치 기반으로 해당 모니터 중앙에 배치
                        if let Ok(cursor) = app.cursor_position() {
                            if let Ok(Some(monitor)) = app.monitor_from_point(cursor.x, cursor.y) {
                                let scale = monitor.scale_factor();
                                let mpos  = monitor.position();
                                let msize = monitor.size();
                                let lx = mpos.x as f64 / scale + (msize.width  as f64 / scale - 380.0) / 2.0;
                                let ly = mpos.y as f64 / scale + (msize.height as f64 / scale - 354.0) / 2.0;
                                let _ = popup.set_position(LogicalPosition::new(lx, ly));
                            }
                        }
                        let _ = popup.show();
                        let _ = popup.set_focus();
                    }
                }
            })?;

            // 트레이 메뉴
            let show_item = MenuItem::with_id(app, "show", "앱 표시", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("WorkLaps")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                            if let Some(qa) = app.get_webview_window("quick-add") {
                                let _ = qa.hide();
                            }
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        position,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(popup) = app.get_webview_window("quick-add") {
                            if popup.is_visible().unwrap_or(false) {
                                let _ = popup.hide();
                                return;
                            }
                            if let Ok(Some(monitor)) = app.monitor_from_point(position.x, position.y) {
                                let scale = monitor.scale_factor();
                                let mpos  = monitor.position();
                                let msize = monitor.size();
                                let lx = mpos.x as f64 / scale + (msize.width  as f64 / scale - 380.0) / 2.0;
                                let ly = mpos.y as f64 / scale + (msize.height as f64 / scale - 354.0) / 2.0;
                                let _ = popup.set_position(LogicalPosition::new(lx, ly));
                            }
                            let _ = popup.show();
                            let _ = popup.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running worklaps");
}
