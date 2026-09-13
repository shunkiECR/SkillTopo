//! サイズ上限付き読込、外部更新検出、一時ファイルを経由する保存。
use super::format::{decode, encode, validate_profile, Profile, MAX_BYTES};
use std::{fs, io::Write, path::Path};

pub(super) fn read_profile(path: &Path) -> Result<(Profile, Vec<u8>), String> {
    use std::io::Read;
    let file = fs::File::open(path).map_err(|e| format!("ファイルを開けません: {e}"))?;
    let mut data = Vec::new();
    file.take(MAX_BYTES + 1)
        .read_to_end(&mut data)
        .map_err(|e| e.to_string())?;
    Ok((decode(&data)?, data))
}

pub(super) fn write_profile(
    path: &Path,
    profile: &Profile,
    original: Option<&[u8]>,
) -> Result<Vec<u8>, String> {
    validate_profile(profile)?;
    // 元バイト列との比較で外部更新を検出する。比較と置換の間をロックする仕組みではない。
    if let Some(original) = original {
        if fs::read(path)
            .map_err(|e| format!("元のファイルを確認できません。別名で保存してください: {e}"))?
            != original
        {
            return Err("このファイルは他のアプリで変更されました。名前を付けて保存するか、開き直してください。".into());
        }
    }
    let extension = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let binary = match extension.as_str() {
        "skilltopo" => true,
        "json" => false,
        _ => return Err("拡張子は .skilltopo または .json を指定してください。".into()),
    };
    let data = encode(profile, binary)?;
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    // 保存先と同じディレクトリで書き終えてから置換し、途中失敗で元ファイルを壊さない。
    let temporary = path.with_file_name(format!(".skilltopo-{}-{unique}.tmp", std::process::id()));
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|e| format!("保存できません: {e}"))?;
    let result = file.write_all(&data).and_then(|_| file.sync_all());
    drop(file);
    let result = result.and_then(|_| fs::rename(&temporary, path));
    if let Err(error) = result {
        let _ = fs::remove_file(&temporary);
        return Err(format!("保存できません: {error}"));
    }
    Ok(data)
}
