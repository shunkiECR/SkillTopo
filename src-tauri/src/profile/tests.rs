//! 形式互換・破損・競合・保存失敗を検証する。
use super::format::{decode, encode, MAX_BYTES};
use super::*;
use std::{fs, io::Write};
#[test]
fn binary_roundtrip_corruption_and_limits() {
    let mut p = blank().unwrap();
    p.user_name = "田中 太郎 🗺".into();
    p.skills[0].notes = "日本語のメモ\n2行目".into();
    p.skills[0].level = Some(4);
    p.skills[0].interest = 3;
    p.skills[0].pinned = true;
    p.skills[0].last_used = "2026-09".into();
    let data = encode(&p, true).unwrap();
    assert!(data.starts_with(b"SKTOPO\0\x01\x1f\x8b"));
    assert!(data.len() < encode(&p, false).unwrap().len());
    assert_eq!(
        serde_json::to_value(decode(&data).unwrap()).unwrap(),
        serde_json::to_value(&p).unwrap()
    );
    for length in [7, 8, 12, data.len() - 1] {
        assert!(decode(&data[..length]).is_err());
    }
    let mut damaged = data.clone();
    damaged[7] = 2;
    assert!(decode(&damaged).is_err());
    let mut damaged = data.clone();
    let end = damaged.len();
    damaged[end - 8] ^= 1;
    assert!(decode(&damaged).is_err());
    let mut trailing = data.clone();
    trailing.push(0);
    assert!(decode(&trailing).is_err());
    let mut encoder =
        flate2::write::GzEncoder::new(b"SKTOPO\0\x01".to_vec(), flate2::Compression::default());
    encoder
        .write_all(&vec![b' '; MAX_BYTES as usize + 1])
        .unwrap();
    assert!(decode(&encoder.finish().unwrap()).is_err());
    // Fixture produced by Node's gzip implementation, also read by the browser tests.
    let fixture = decode(include_bytes!("../../../examples/tanaka.skilltopo")).unwrap();
    let json = decode(include_bytes!("../../../examples/tanaka.json")).unwrap();
    assert_eq!(
        serde_json::to_value(fixture).unwrap(),
        serde_json::to_value(json).unwrap()
    );
}
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
    assert!(restored.skills[1..]
        .iter()
        .all(|s| s.level.is_none() && s.interest == 0 && s.notes.is_empty()));
    p.version = 2;
    assert!(decode(&serde_json::to_vec(&p).unwrap()).is_err());
    p.version = 1;
    p.user_name = " ".into();
    assert!(decode(&serde_json::to_vec(&p).unwrap()).is_err());
    assert!(decode(b"broken").is_err());
    assert!(decode(&vec![b' '; MAX_BYTES as usize + 1]).is_err());
}
#[test]
fn independent_files_conflicts_and_failed_saves() {
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let dir = std::env::temp_dir().join(format!(
        "skilltopo-profiles-{}-{unique}",
        std::process::id()
    ));
    fs::create_dir(&dir).unwrap();
    let a = dir.join("a.skilltopo");
    let b = dir.join("b.json");
    let mut p = blank().unwrap();
    p.user_name = "A".into();
    let before = write_profile(&a, &p, None).unwrap();
    p.user_name = "B".into();
    p.skills[0].level = Some(4);
    write_profile(&b, &p, None).unwrap();
    assert_eq!(read_profile(&a).unwrap().0.user_name, "A");
    assert_eq!(read_profile(&b).unwrap().0.user_name, "B");
    let changed = write_profile(&a, &p, Some(&before)).unwrap();
    assert!(write_profile(&a, &p, Some(&before)).is_err());
    p.skills[0].level = Some(8);
    assert!(write_profile(&a, &p, Some(&changed)).is_err());
    assert_eq!(fs::read(&a).unwrap(), changed);
    fs::remove_file(a).unwrap();
    fs::remove_file(b).unwrap();
    fs::remove_dir(dir).unwrap();
}
