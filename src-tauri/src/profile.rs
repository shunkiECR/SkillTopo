use super::{seed_catalog, validate, Skill};
use serde::{Deserialize, Serialize};
use std::{fs, io::Write, path::{Path, PathBuf}, sync::Mutex};
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};

const MAX_BYTES: u64 = 8 * 1024 * 1024;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Profile {
    format: String,
    version: u32,
    user_name: String,
    skills: Vec<Skill>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    profile: Profile,
    path: Option<String>,
    dirty: bool,
}

#[derive(Default)]
pub struct Session {
    path: Option<PathBuf>,
    original: Option<Vec<u8>>,
    pub dirty: bool,
    pub closing: bool,
}

fn blank() -> Result<Profile, String> {
    let mut skills = seed_catalog()?;
    for skill in &mut skills {
        skill.level = None;
        skill.interest = 0;
        skill.last_used.clear();
        skill.pinned = false;
        skill.notes.clear();
    }
    Ok(Profile { format: "skilltopo-profile".into(), version: 1, user_name: "未設定".into(), skills })
}

fn validate_profile(profile: &Profile) -> Result<(), String> {
    if profile.format != "skilltopo-profile" || profile.version != 1 {
        return Err("対応していないプロフィール形式またはバージョンです。".into());
    }
    if profile.user_name.trim().is_empty() || profile.user_name.chars().count() > 80 {
        return Err("ユーザー名は1〜80文字で入力してください。".into());
    }
    validate(&profile.skills)
}

fn decode(data: &[u8]) -> Result<Profile, String> {
    if data.len() as u64 > MAX_BYTES { return Err("ファイルは8 MB以下にしてください。".into()); }
    let data = data.strip_prefix(&[0xef, 0xbb, 0xbf]).unwrap_or(data);
    let mut profile: Profile = serde_json::from_slice(data).map_err(|e| format!("JSONを読み込めません: {e}"))?;
    // Omitted built-in skills are always unassessed, never another person's demo ratings.
    if profile.skills.is_empty() { return Err("スキルを1件以上含めてください。".into()); }
    let existing: std::collections::HashSet<_> = profile.skills.iter().map(|s| s.id.clone()).collect();
    for skill in blank()?.skills {
        if !existing.contains(&skill.id) { profile.skills.push(skill); }
    }
    validate_profile(&profile)?;
    Ok(profile)
}

fn read_profile(path: &Path) -> Result<(Profile, Vec<u8>), String> {
    use std::io::Read;
    let file = fs::File::open(path).map_err(|e| format!("ファイルを開けません: {e}"))?;
    let mut data = Vec::new();
    file.take(MAX_BYTES + 1).read_to_end(&mut data).map_err(|e| e.to_string())?;
    Ok((decode(&data)?, data))
}

fn write_profile(path: &Path, profile: &Profile, original: Option<&[u8]>) -> Result<Vec<u8>, String> {
    validate_profile(profile)?;
    if let Some(original) = original {
        if fs::read(path).map_err(|e| format!("元のファイルを確認できません。別名で保存してください: {e}"))? != original {
            return Err("このファイルは他のアプリで変更されました。名前を付けて保存するか、開き直してください。".into());
        }
    }
    let data = serde_json::to_vec_pretty(profile).map_err(|e| e.to_string())?;
    let unique = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
    let temporary = path.with_file_name(format!(".skilltopo-{}-{unique}.tmp", std::process::id()));
    let mut file = fs::OpenOptions::new().write(true).create_new(true).open(&temporary).map_err(|e| format!("保存できません: {e}"))?;
    let result = file.write_all(&data).and_then(|_| file.sync_all());
    drop(file);
    let result = result.and_then(|_| fs::rename(&temporary, path));
    if let Err(error) = result {
        let _ = fs::remove_file(&temporary);
        return Err(format!("保存できません: {error}"));
    }
    Ok(data)
}

fn document(profile: Profile, session: &Session) -> Document {
    Document { profile, path: session.path.as_ref().map(|p| p.to_string_lossy().into_owned()), dirty: session.dirty }
}

fn can_discard(app: &tauri::AppHandle) -> Result<bool, String> {
    let dirty = app.state::<Mutex<Session>>().lock().map_err(|e| e.to_string())?.dirty;
    Ok(!dirty || app.dialog().message("未保存の変更を破棄しますか？変更を残すにはキャンセルして保存してください。")
        .title("SkillTopo — 未保存の変更").buttons(MessageDialogButtons::OkCancelCustom("破棄する".into(), "キャンセル".into())).blocking_show())
}

#[tauri::command]
pub fn initial_profile() -> Result<Document, String> { Ok(document(blank()?, &Session::default())) }

#[tauri::command]
pub fn mark_profile_dirty(app: tauri::AppHandle) -> Result<(), String> {
    app.state::<Mutex<Session>>().lock().map_err(|e| e.to_string())?.dirty = true;
    Ok(())
}

#[tauri::command]
pub async fn new_profile(app: tauri::AppHandle) -> Result<Option<Document>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if !can_discard(&app)? { return Ok(None); }
        let state = app.state::<Mutex<Session>>();
        let mut session = state.lock().map_err(|e| e.to_string())?;
        *session = Session::default();
        Ok(Some(document(blank()?, &session)))
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn open_profile(app: tauri::AppHandle, legacy: bool) -> Result<Option<Document>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if !can_discard(&app)? { return Ok(None); }
        let (profile, path, original) = if legacy {
            let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("catalog.json");
            if !path.exists() { return Err("旧版の保存データが見つかりませんでした。".into()); }
            let mut profile = blank()?;
            profile.user_name = "自分（旧データ）".into();
            profile.skills = super::read_catalog(&path)?;
            (profile, None, None)
        } else {
            let Some(file) = app.dialog().file().set_title("プロフィールを開く").add_filter("SkillTopo プロフィール", &["json"]).blocking_pick_file() else { return Ok(None); };
            let path = file.into_path().map_err(|e| e.to_string())?;
            let (profile, data) = read_profile(&path)?;
            (profile, Some(path), Some(data))
        };
        let state = app.state::<Mutex<Session>>();
        let mut session = state.lock().map_err(|e| e.to_string())?;
        *session = Session { path, original, dirty: legacy, closing: false };
        Ok(Some(document(profile, &session)))
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_profile(app: tauri::AppHandle, profile: Profile, save_as: bool) -> Result<Option<Document>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        validate_profile(&profile)?;
        let state = app.state::<Mutex<Session>>();
        let current_path = state.lock().map_err(|e| e.to_string())?.path.clone();
        let path = if save_as || current_path.is_none() {
            let Some(file) = app.dialog().file().set_title("プロフィールを保存").add_filter("SkillTopo プロフィール", &["json"]).set_file_name("profile.json").blocking_save_file() else { return Ok(None); };
            let mut path = file.into_path().map_err(|e| e.to_string())?;
            if path.extension().is_none() { path.set_extension("json"); }
            path
        } else { current_path.clone().unwrap() };
        let mut session = state.lock().map_err(|e| e.to_string())?;
        let expected = if current_path.as_ref() == Some(&path) { session.original.as_deref() } else { None };
        let data = write_profile(&path, &profile, expected)?;
        *session = Session { path: Some(path), original: Some(data), dirty: false, closing: false };
        Ok(Some(document(profile, &session)))
    }).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn profile_roundtrip_and_sparse_import() {
        let mut p = blank().unwrap();
        p.user_name = "田中 太郎".into();
        p.skills[0].level = Some(4);
        p.skills[0].notes = "実務で使用".into();
        p.skills.truncate(1);
        let restored = decode(&serde_json::to_vec(&p).unwrap()).unwrap();
        assert_eq!(restored.user_name, "田中 太郎");
        assert_eq!(restored.skills.len(), 186);
        assert_eq!(restored.skills[0].notes, "実務で使用");
        assert!(restored.skills[1..].iter().all(|s| s.level.is_none() && s.interest == 0 && s.notes.is_empty()));
        p.version = 2;
        assert!(decode(&serde_json::to_vec(&p).unwrap()).is_err());
        p.version = 1; p.user_name = " ".into();
        assert!(decode(&serde_json::to_vec(&p).unwrap()).is_err());
        assert!(decode(b"broken").is_err());
        assert!(decode(&vec![b' '; MAX_BYTES as usize + 1]).is_err());
    }
    #[test]
    fn independent_files_conflicts_and_failed_saves() {
        let unique = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
        let dir = std::env::temp_dir().join(format!("skilltopo-profiles-{}-{unique}", std::process::id()));
        fs::create_dir(&dir).unwrap();
        let a = dir.join("a.json"); let b = dir.join("b.json");
        let mut p = blank().unwrap(); p.user_name = "A".into();
        let before = write_profile(&a, &p, None).unwrap();
        p.user_name = "B".into(); p.skills[0].level = Some(4);
        write_profile(&b, &p, None).unwrap();
        assert_eq!(read_profile(&a).unwrap().0.user_name, "A");
        assert_eq!(read_profile(&b).unwrap().0.user_name, "B");
        let changed = write_profile(&a, &p, Some(&before)).unwrap();
        assert!(write_profile(&a, &p, Some(&before)).is_err());
        p.skills[0].level = Some(8);
        assert!(write_profile(&a, &p, Some(&changed)).is_err());
        assert_eq!(fs::read(&a).unwrap(), changed);
        fs::remove_file(a).unwrap(); fs::remove_file(b).unwrap(); fs::remove_dir(dir).unwrap();
    }
}
