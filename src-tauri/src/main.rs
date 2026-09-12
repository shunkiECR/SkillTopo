#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fs, sync::Mutex};
use tauri::Manager;

const SEED: &str = include_str!("../../ui/data/catalog.json");

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Skill {
    id: String,
    name: String,
    category: String,
    description: String,
    level: Option<u8>,
    interest: u8,
    last_used: String,
    pinned: bool,
    related: Vec<String>,
    notes: String,
}

fn validate(skills: &[Skill]) -> Result<(), String> {
    if skills.is_empty() || skills.len() > 500 {
        return Err("スキル数は1〜500件にしてください。".into());
    }
    let mut ids = HashSet::new();
    for skill in skills {
        if skill.id.is_empty() || !ids.insert(&skill.id) {
            return Err("スキルIDが空、または重複しています。".into());
        }
        if skill.name.trim().is_empty() || skill.name.chars().count() > 40 {
            return Err("スキル名は1〜40文字にしてください。".into());
        }
        if !["electrical", "control", "embedded", "software", "mechanical"].contains(&skill.category.as_str())
            || skill.level.is_some_and(|level| level > 4) || skill.interest > 4
        {
            return Err("分野または評価値が不正です。".into());
        }
        if skill.description.len() > 12000 || skill.notes.len() > 24000 {
            return Err("説明またはメモが長すぎます。".into());
        }
        if !skill.last_used.is_empty() {
            let date = skill.last_used.as_bytes();
            if date.len() != 7 || date[4] != b'-' || !date[..4].iter().all(u8::is_ascii_digit)
                || !date[5..].iter().all(u8::is_ascii_digit)
                || !(1..=12).contains(&skill.last_used[5..].parse::<u8>().unwrap_or(0)) {
                return Err("最終使用月の形式が不正です。".into());
            }
        }
    }
    for skill in skills {
        if skill.related.iter().any(|id| !ids.contains(id) || id == &skill.id) {
            return Err("関連スキルが見つからないか、自分自身を参照しています。".into());
        }
    }
    Ok(())
}

#[tauri::command]
fn load_catalog(app: tauri::AppHandle, lock: tauri::State<Mutex<()>>) -> Result<Vec<Skill>, String> {
    let _guard = lock.lock().map_err(|e| e.to_string())?;
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("catalog.json");
    let data = match fs::read_to_string(path) {
        Ok(data) => data,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => SEED.to_owned(),
        Err(e) => return Err(format!("保存データを読み込めません: {e}")),
    };
    let skills: Vec<Skill> = serde_json::from_str(&data).map_err(|e| format!("保存データの形式が不正です: {e}"))?;
    validate(&skills)?;
    Ok(skills)
}

#[tauri::command]
fn save_catalog(app: tauri::AppHandle, lock: tauri::State<Mutex<()>>, skills: Vec<Skill>) -> Result<(), String> {
    validate(&skills)?;
    let _guard = lock.lock().map_err(|e| e.to_string())?;
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let data = serde_json::to_vec_pretty(&skills).map_err(|e| e.to_string())?;
    let temporary = directory.join("catalog.tmp");
    fs::write(&temporary, data).map_err(|e| format!("保存できません: {e}"))?;
    fs::rename(temporary, directory.join("catalog.json")).map_err(|e| format!("保存を確定できません: {e}"))?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(()))
        .invoke_handler(tauri::generate_handler![load_catalog, save_catalog])
        .run(tauri::generate_context!())
        .expect("SkillTopoの起動に失敗しました");
}

#[cfg(test)]
mod tests {
    use super::*;
    fn seed() -> Vec<Skill> { serde_json::from_str(SEED).unwrap() }
    #[test]
    fn seed_and_json_roundtrip_are_valid() {
        let skills = seed();
        validate(&skills).unwrap();
        let restored: Vec<Skill> = serde_json::from_str(&serde_json::to_string(&skills).unwrap()).unwrap();
        assert_eq!(restored.len(), 28);
        validate(&restored).unwrap();
    }
    #[test]
    fn rejects_invalid_ratings_and_references() {
        let mut skills = seed();
        skills[0].level = Some(5);
        assert!(validate(&skills).is_err());
        skills[0].level = None;
        skills[0].related.push("missing".into());
        assert!(validate(&skills).is_err());
    }
    #[test]
    fn rejects_duplicate_ids_and_invalid_dates() {
        let mut skills = seed();
        skills[1].id = skills[0].id.clone();
        assert!(validate(&skills).is_err());
        let mut skills = seed();
        skills[0].last_used = "2026-13".into();
        assert!(validate(&skills).is_err());
    }
}
