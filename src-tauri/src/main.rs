#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod catalog;
mod profile;

use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};

// ホスト設定と終了確認だけを扱う。データ操作は catalog / profile に委譲する。
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(profile::Session::default()))
        .invoke_handler(tauri::generate_handler![
            profile::initial_profile,
            profile::new_profile,
            profile::open_profile,
            profile::save_profile,
            profile::mark_profile_dirty
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<Mutex<profile::Session>>();
                let Ok(mut session) = state.lock() else {
                    api.prevent_close();
                    return;
                };
                if session.dirty {
                    api.prevent_close();
                    if session.closing {
                        return;
                    }
                    session.closing = true;
                    let window = window.clone();
                    window
                        .clone()
                        .dialog()
                        .message("未保存の変更を破棄して終了しますか？")
                        .title("SkillTopo — 未保存の変更")
                        .buttons(MessageDialogButtons::OkCancelCustom(
                            "破棄して終了".into(),
                            "キャンセル".into(),
                        ))
                        .show(move |discard| {
                            if discard {
                                let _ = window.destroy();
                            } else if let Ok(mut s) =
                                window.state::<Mutex<profile::Session>>().lock()
                            {
                                s.closing = false;
                            }
                        });
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("SkillTopoの起動に失敗しました");
}
