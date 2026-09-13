//! スキルの型・標準カタログ合成・共通検証・旧版カタログの読み込み。
use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fs, path::Path};

const SEED: &str = include_str!("../../frontend/src/catalog.json");
const PROFILE_ITEMS: &str = include_str!("../../frontend/src/profile-items.json");
const CATEGORIES: &str = include_str!("../../frontend/src/categories.json");

pub(crate) fn seed_catalog() -> Result<Vec<Skill>, String> {
    let mut skills: Vec<Skill> = serde_json::from_str(SEED).map_err(|e| e.to_string())?;
    let items: Vec<[String; 7]> = serde_json::from_str(PROFILE_ITEMS).map_err(|e| e.to_string())?;
    for [id, name, category, _kind, _aliases, description, related] in items {
        skills.push(Skill {
            id,
            name,
            category,
            description,
            level: None,
            interest: 0,
            last_used: String::new(),
            pinned: false,
            related: related.split('|').map(str::to_owned).collect(),
            notes: String::new(),
        });
    }
    Ok(skills)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Skill {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) category: String,
    pub(crate) description: String,
    pub(crate) level: Option<u8>,
    pub(crate) interest: u8,
    pub(crate) last_used: String,
    pub(crate) pinned: bool,
    pub(crate) related: Vec<String>,
    pub(crate) notes: String,
}

pub(crate) fn validate(skills: &[Skill]) -> Result<(), String> {
    #[derive(Deserialize)]
    struct Category {
        id: String,
    }
    let categories: Vec<Category> = serde_json::from_str(CATEGORIES).map_err(|e| e.to_string())?;
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
        if !categories
            .iter()
            .any(|category| category.id == skill.category)
            || skill.level.is_some_and(|level| level > 4)
            || skill.interest > 4
        {
            return Err("分野または評価値が不正です。".into());
        }
        if skill.description.len() > 12000 || skill.notes.len() > 24000 {
            return Err("説明またはメモが長すぎます。".into());
        }
        if !skill.last_used.is_empty() {
            let date = skill.last_used.as_bytes();
            if date.len() != 7
                || date[4] != b'-'
                || !date[..4].iter().all(u8::is_ascii_digit)
                || !date[5..].iter().all(u8::is_ascii_digit)
                || !(1..=12).contains(&skill.last_used[5..].parse::<u8>().unwrap_or(0))
            {
                return Err("最終使用月の形式が不正です。".into());
            }
        }
    }
    for skill in skills {
        if skill
            .related
            .iter()
            .any(|id| !ids.contains(id) || id == &skill.id)
        {
            return Err("関連スキルが見つからないか、自分自身を参照しています。".into());
        }
    }
    Ok(())
}

pub(crate) fn read_catalog(path: &Path) -> Result<Vec<Skill>, String> {
    let data = match fs::read_to_string(path) {
        Ok(data) => data,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            let skills = seed_catalog()?;
            validate(&skills)?;
            return Ok(skills);
        }
        Err(e) => return Err(format!("保存データを読み込めません: {e}")),
    };
    let mut skills: Vec<Skill> =
        serde_json::from_str(&data).map_err(|e| format!("保存データの形式が不正です: {e}"))?;
    if skills.is_empty() {
        return Err("保存されたカタログが空です。".into());
    }
    // 旧版移行でも既存IDの評価・メモ・日付・関連を保持し、不足IDだけを追加する。
    let existing: HashSet<String> = skills.iter().map(|skill| skill.id.clone()).collect();
    for skill in seed_catalog()? {
        if !existing.contains(&skill.id) {
            skills.push(skill);
        }
    }
    validate(&skills)?;
    Ok(skills)
}

#[cfg(test)]
fn write_catalog(directory: &Path, skills: &[Skill]) -> Result<(), String> {
    validate(skills)?;
    fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    let data = serde_json::to_vec_pretty(skills).map_err(|e| e.to_string())?;
    let temporary = directory.join("catalog.tmp");
    fs::write(&temporary, data).map_err(|e| format!("保存できません: {e}"))?;
    fs::rename(temporary, directory.join("catalog.json"))
        .map_err(|e| format!("保存を確定できません: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn seed() -> Vec<Skill> {
        seed_catalog().unwrap()
    }
    #[test]
    fn seed_and_json_roundtrip_are_valid() {
        let skills = seed();
        validate(&skills).unwrap();
        let restored: Vec<Skill> =
            serde_json::from_str(&serde_json::to_string(&skills).unwrap()).unwrap();
        assert_eq!(restored.len(), skills.len());
        assert!(restored.len() > 150);
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

    #[test]
    fn saves_replaces_and_reloads_without_destroying_invalid_data() {
        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory =
            std::env::temp_dir().join(format!("skilltopo-test-{}-{unique}", std::process::id()));
        let path = directory.join("catalog.json");
        let mut skills = read_catalog(&path).unwrap();
        write_catalog(&directory, &skills).unwrap();
        skills[0].level = Some(4);
        write_catalog(&directory, &skills).unwrap();
        assert_eq!(read_catalog(&path).unwrap()[0].level, Some(4));
        let before = fs::read(&path).unwrap();
        skills[0].level = Some(9);
        assert!(write_catalog(&directory, &skills).is_err());
        assert_eq!(fs::read(&path).unwrap(), before);
        fs::write(&path, b"broken-json").unwrap();
        assert!(read_catalog(&path).is_err());
        assert_eq!(fs::read(&path).unwrap(), b"broken-json");
        fs::remove_file(&path).unwrap();
        fs::remove_dir(&directory).unwrap();
    }

    #[test]
    fn upgrades_old_catalog_without_resetting_existing_work() {
        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "skilltopo-migration-{}-{unique}",
            std::process::id()
        ));
        fs::create_dir_all(&directory).unwrap();
        let path = directory.join("catalog.json");
        let mut old: Vec<Skill> = serde_json::from_str(SEED).unwrap();
        old[0].level = Some(4);
        old[0].notes = "ユーザーが記入したメモ".into();
        old[0].pinned = true;
        let original = serde_json::to_vec(&old).unwrap();
        fs::write(&path, &original).unwrap();
        let upgraded = read_catalog(&path).unwrap();
        assert_eq!(upgraded.len(), seed().len());
        assert_eq!(upgraded[0].level, Some(4));
        assert_eq!(upgraded[0].notes, old[0].notes);
        assert!(upgraded[0].pinned);
        assert!(upgraded
            .iter()
            .filter(|s| !old.iter().any(|o| o.id == s.id))
            .all(|s| s.level.is_none() && s.interest == 0));
        assert_eq!(
            fs::read(&path).unwrap(),
            original,
            "Loading must not rewrite the saved file"
        );
        write_catalog(&directory, &upgraded).unwrap();
        assert_eq!(
            read_catalog(&path).unwrap().len(),
            upgraded.len(),
            "Repeated upgrade must not duplicate items"
        );
        fs::remove_file(path).unwrap();
        fs::remove_dir(directory).unwrap();
    }
}
