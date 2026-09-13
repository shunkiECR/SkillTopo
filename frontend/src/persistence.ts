/** 保存操作の窓口。デスクトップの失敗をブラウザ保存へ切り替えない。 */
import { blankProfile } from './profile/validation';
import { decodeProfileBytes, encodeProfileBytes } from './profile/codec';
import {
  MAX_PROFILE_BYTES,
  type Profile,
  type ProfileDocument,
  type FileFormat,
} from './profile/types';

// 既存の呼び出し元のために公開入口を維持する。実装を編集する場合は profile/ を参照。
export { blankProfile, parseProfile } from './profile/validation';
export { decodeProfileBytes, encodeProfileBytes } from './profile/codec';
export type { Profile, ProfileDocument, FileFormat } from './profile/types';

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
declare global {
  interface Window {
    __TAURI__?: { core: { invoke: Invoke } };
  }
}

export const isDesktop = () => typeof window !== 'undefined' && !!window.__TAURI__;

export async function initialProfile(): Promise<ProfileDocument> {
  return isDesktop()
    ? window.__TAURI__!.core.invoke('initial_profile')
    : { profile: blankProfile(), path: null, dirty: false };
}
export async function markDirty(): Promise<void> {
  if (isDesktop()) await window.__TAURI__!.core.invoke('mark_profile_dirty');
}
export async function newProfile(dirty: boolean): Promise<ProfileDocument | null> {
  if (isDesktop()) return window.__TAURI__!.core.invoke('new_profile');
  if (dirty && !window.confirm('未保存の変更を破棄しますか？')) return null;
  return initialProfile();
}
export async function openProfile(dirty: boolean, legacy = false): Promise<ProfileDocument | null> {
  if (isDesktop()) return window.__TAURI__!.core.invoke('open_profile', { legacy });
  if (dirty && !window.confirm('未保存の変更を破棄しますか？')) return null;
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.skilltopo,.json,application/json';
    input.oncancel = () => resolve(null);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        if (file.size > MAX_PROFILE_BYTES) throw new Error('ファイルは8 MB以下にしてください。');
        resolve({
          profile: await decodeProfileBytes(new Uint8Array(await file.arrayBuffer())),
          path: file.name,
          dirty: false,
        });
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}
export async function saveProfile(
  profile: Profile,
  saveAs = false,
  fileFormat: FileFormat = 'binary',
): Promise<ProfileDocument | null> {
  const snapshot = structuredClone(profile);
  if (isDesktop())
    return window.__TAURI__!.core.invoke('save_profile', { profile: snapshot, saveAs, fileFormat });
  const bytes = await encodeProfileBytes(snapshot, fileFormat);
  const filename = fileFormat === 'binary' ? 'profile.skilltopo' : 'profile.json';
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], {
      type: fileFormat === 'binary' ? 'application/octet-stream' : 'application/json',
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { profile: snapshot, path: `${filename}（ダウンロード）`, dirty: false };
}
