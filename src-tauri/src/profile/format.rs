//! プロフィールの型・初期値・検証と JSON / gzip 変換。ファイルやダイアログは操作しない。
use crate::catalog::{seed_catalog, validate, Skill};
use serde::{Deserialize, Serialize};
use std::io::Write;

pub(super) const MAX_BYTES: u64 = 8 * 1024 * 1024;
// 本文のProfile.versionとは独立した、バイナリの識別子とバージョン。
const MAGIC: &[u8] = b"SKTOPO\0";
const BINARY_VERSION: u8 = 1;

fn unpack(data: &[u8]) -> Result<Vec<u8>, String> {
    use std::io::Read;
    if !data.starts_with(MAGIC) {
        return Ok(data.to_vec());
    }
    if data.get(MAGIC.len()) != Some(&BINARY_VERSION) {
        return Err("対応していないバイナリ形式のバージョンです。".into());
    }
    let payload = &data[MAGIC.len() + 1..];
    let mut decoder = flate2::bufread::GzDecoder::new(payload);
    let mut json = Vec::new();
    // 上限を1バイト超えるまでしか読まない。展開結果を無制限に確保しないため。
    (&mut decoder)
        .take(MAX_BYTES + 1)
        .read_to_end(&mut json)
        .map_err(|_| "バイナリファイルが破損しているか、不完全です。".to_string())?;
    if json.len() as u64 > MAX_BYTES {
        return Err("展開後のファイルは8 MB以下にしてください。".into());
    }
    if !decoder.get_ref().is_empty() {
        return Err("バイナリファイルに余分なデータがあります。".into());
    }
    Ok(json)
}

pub(super) fn encode(profile: &Profile, binary: bool) -> Result<Vec<u8>, String> {
    validate_profile(profile)?;
    let json = if binary {
        serde_json::to_vec(profile)
    } else {
        serde_json::to_vec_pretty(profile)
    }
    .map_err(|e| e.to_string())?;
    if json.len() as u64 > MAX_BYTES {
        return Err("ファイルは8 MB以下にしてください。".into());
    }
    if !binary {
        return Ok(json);
    }
    let mut data = MAGIC.to_vec();
    data.push(BINARY_VERSION);
    let mut encoder = flate2::write::GzEncoder::new(data, flate2::Compression::default());
    encoder.write_all(&json).map_err(|e| e.to_string())?;
    let data = encoder.finish().map_err(|e| e.to_string())?;
    if data.len() as u64 > MAX_BYTES {
        return Err("ファイルは8 MB以下にしてください。".into());
    }
    Ok(data)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Profile {
    pub(super) format: String,
    pub(super) version: u32,
    pub(super) user_name: String,
    pub(super) skills: Vec<Skill>,
}

pub(super) fn blank() -> Result<Profile, String> {
    let mut skills = seed_catalog()?;
    for skill in &mut skills {
        skill.level = None;
        skill.interest = 0;
        skill.last_used.clear();
        skill.pinned = false;
        skill.notes.clear();
    }
    Ok(Profile {
        format: "skilltopo-profile".into(),
        version: 1,
        user_name: "未設定".into(),
        skills,
    })
}

pub(super) fn validate_profile(profile: &Profile) -> Result<(), String> {
    if profile.format != "skilltopo-profile" || profile.version != 1 {
        return Err("対応していないプロフィール形式またはバージョンです。".into());
    }
    if profile.user_name.trim().is_empty() || profile.user_name.chars().count() > 80 {
        return Err("ユーザー名は1〜80文字で入力してください。".into());
    }
    validate(&profile.skills)
}

pub(super) fn decode(data: &[u8]) -> Result<Profile, String> {
    if data.len() as u64 > MAX_BYTES {
        return Err("ファイルは8 MB以下にしてください。".into());
    }
    let unpacked = unpack(data)?;
    let data = unpacked.as_slice();
    let data = data.strip_prefix(&[0xef, 0xbb, 0xbf]).unwrap_or(data);
    let mut profile: Profile =
        serde_json::from_slice(data).map_err(|e| format!("JSONを読み込めません: {e}"))?;
    // 不足する標準IDは未評価で補完する。既存IDの値やデモ評価で上書きしない。
    if profile.skills.is_empty() {
        return Err("スキルを1件以上含めてください。".into());
    }
    let existing: std::collections::HashSet<_> =
        profile.skills.iter().map(|s| s.id.clone()).collect();
    for skill in blank()?.skills {
        if !existing.contains(&skill.id) {
            profile.skills.push(skill);
        }
    }
    validate_profile(&profile)?;
    Ok(profile)
}
