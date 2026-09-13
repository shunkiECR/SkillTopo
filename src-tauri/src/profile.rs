//! Tauriコマンドとウィンドウ単位のセッション管理。形式変換・I/Oは子モジュールへ委譲する。
mod format;
mod storage;

pub use format::Profile;
use format::{blank, validate_profile};
use serde::Serialize;
use std::{path::PathBuf, sync::Mutex};
use storage::{read_profile, write_profile};
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    profile: Profile,
    path: Option<String>,
    dirty: bool,
}

#[derive(Default)]
/// ウィンドウ単位の保存状態。編集中のプロフィール本体はReact側で保持する。
pub struct Session {
    path: Option<PathBuf>,
    original: Option<Vec<u8>>,
    pub dirty: bool,
    pub closing: bool,
}

fn document(profile: Profile, session: &Session) -> Document {
    Document {
        profile,
        path: session
            .path
            .as_ref()
            .map(|p| p.to_string_lossy().into_owned()),
        dirty: session.dirty,
    }
}

fn can_discard(app: &tauri::AppHandle) -> Result<bool, String> {
    let dirty = app
        .state::<Mutex<Session>>()
        .lock()
        .map_err(|e| e.to_string())?
        .dirty;
    Ok(!dirty
        || app
            .dialog()
            .message("未保存の変更を破棄しますか？変更を残すにはキャンセルして保存してください。")
            .title("SkillTopo — 未保存の変更")
            .buttons(MessageDialogButtons::OkCancelCustom(
                "破棄する".into(),
                "キャンセル".into(),
            ))
            .blocking_show())
}

#[tauri::command]
pub fn initial_profile() -> Result<Document, String> {
    Ok(document(blank()?, &Session::default()))
}

#[tauri::command]
pub fn mark_profile_dirty(app: tauri::AppHandle) -> Result<(), String> {
    app.state::<Mutex<Session>>()
        .lock()
        .map_err(|e| e.to_string())?
        .dirty = true;
    Ok(())
}

#[tauri::command]
pub async fn new_profile(app: tauri::AppHandle) -> Result<Option<Document>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if !can_discard(&app)? {
            return Ok(None);
        }
        let state = app.state::<Mutex<Session>>();
        let mut session = state.lock().map_err(|e| e.to_string())?;
        *session = Session::default();
        Ok(Some(document(blank()?, &session)))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn open_profile(app: tauri::AppHandle, legacy: bool) -> Result<Option<Document>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if !can_discard(&app)? {
            return Ok(None);
        }
        let (profile, path, original) = if legacy {
            let path = app
                .path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join("catalog.json");
            if !path.exists() {
                return Err("旧版の保存データが見つかりませんでした。".into());
            }
            let mut profile = blank()?;
            profile.user_name = "自分（旧データ）".into();
            profile.skills = crate::catalog::read_catalog(&path)?;
            (profile, None, None)
        } else {
            let Some(file) = app
                .dialog()
                .file()
                .set_title("プロフィールを開く")
                .add_filter("SkillTopo プロフィール", &["skilltopo", "json"])
                .blocking_pick_file()
            else {
                return Ok(None);
            };
            let path = file.into_path().map_err(|e| e.to_string())?;
            let (profile, data) = read_profile(&path)?;
            (profile, Some(path), Some(data))
        };
        let state = app.state::<Mutex<Session>>();
        let mut session = state.lock().map_err(|e| e.to_string())?;
        *session = Session {
            path,
            original,
            dirty: legacy,
            closing: false,
        };
        Ok(Some(document(profile, &session)))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_profile(
    app: tauri::AppHandle,
    profile: Profile,
    save_as: bool,
    file_format: Option<String>,
) -> Result<Option<Document>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        validate_profile(&profile)?;
        let state = app.state::<Mutex<Session>>();
        let current_path = state.lock().map_err(|e| e.to_string())?.path.clone();
        let path = if save_as || current_path.is_none() {
            let extension = match file_format.as_deref().unwrap_or("binary") {
                "binary" => "skilltopo",
                "json" => "json",
                _ => return Err("保存形式が不正です。".into()),
            };
            let Some(file) = app
                .dialog()
                .file()
                .set_title("プロフィールを保存")
                .add_filter("SkillTopo プロフィール", &[extension])
                .set_file_name(format!("profile.{extension}"))
                .blocking_save_file()
            else {
                return Ok(None);
            };
            let mut path = file.into_path().map_err(|e| e.to_string())?;
            if path.extension().is_none() {
                path.set_extension(extension);
            }
            if !path
                .extension()
                .and_then(|s| s.to_str())
                .is_some_and(|s| s.eq_ignore_ascii_case(extension))
            {
                return Err(format!(
                    "選択した保存形式の拡張子 .{extension} を指定してください。"
                ));
            }
            path
        } else {
            current_path.clone().unwrap()
        };
        let mut session = state.lock().map_err(|e| e.to_string())?;
        let expected = if current_path.as_ref() == Some(&path) {
            session.original.as_deref()
        } else {
            None
        };
        let data = write_profile(&path, &profile, expected)?;
        *session = Session {
            path: Some(path),
            original: Some(data),
            dirty: false,
            closing: false,
        };
        Ok(Some(document(profile, &session)))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests;
