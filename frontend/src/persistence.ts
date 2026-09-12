import { seed, categories, type Skill } from './model';

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
declare global {
  interface Window { __TAURI__?: { core: { invoke: Invoke } }; }
}

export const isDesktop = () => typeof window !== 'undefined' && !!window.__TAURI__;

export type Profile = { format: 'skilltopo-profile'; version: 1; userName: string; skills: Skill[] };
export type ProfileDocument = { profile: Profile; path: string | null; dirty: boolean };
export function blankProfile(): Profile {
  return { format: 'skilltopo-profile', version: 1, userName: '未設定', skills: structuredClone(seed).map(s => ({ ...s, level: null, interest: 0, lastUsed: '', pinned: false, notes: '' })) };
}

export function parseProfile(text: string): Profile {
  if (new TextEncoder().encode(text).length > 8 * 1024 * 1024) throw new Error('ファイルは8 MB以下にしてください。');
  const p = JSON.parse(text.replace(/^\uFEFF/, ''));
  if (!p || p.format !== 'skilltopo-profile' || p.version !== 1 || typeof p.userName !== 'string' || !p.userName.trim() || [...p.userName].length > 80 || !Array.isArray(p.skills) || !p.skills.length || p.skills.length > 500) throw new Error('プロフィール形式・ユーザー名・スキル数が不正です。');
  const ids = new Set<string>();
  for (const s of p.skills) {
    if (!s || typeof s.id !== 'string' || !s.id || ids.has(s.id) || typeof s.name !== 'string' || !s.name.trim() || [...s.name].length > 40 || !categories.some(c => c.id === s.category) || !(s.level === null || Number.isInteger(s.level) && s.level >= 0 && s.level <= 4) || !Number.isInteger(s.interest) || s.interest < 0 || s.interest > 4 || typeof s.description !== 'string' || new TextEncoder().encode(s.description).length > 12000 || typeof s.notes !== 'string' || new TextEncoder().encode(s.notes).length > 24000 || typeof s.pinned !== 'boolean' || typeof s.lastUsed !== 'string' || s.lastUsed !== '' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(s.lastUsed) || !Array.isArray(s.related) || s.related.some((id: unknown) => typeof id !== 'string')) throw new Error('スキルの値が不正です。');
    ids.add(s.id);
  }
  const profile: Profile = { ...p, skills: [...p.skills, ...blankProfile().skills.filter(s => !ids.has(s.id))] };
  const all = new Set(profile.skills.map(s => s.id));
  if (profile.skills.length > 500 || profile.skills.some(s => s.related.some(id => !all.has(id) || id === s.id))) throw new Error('関連スキルの参照が不正です。');
  return profile;
}
export async function initialProfile(): Promise<ProfileDocument> {
  return isDesktop() ? window.__TAURI__!.core.invoke('initial_profile') : { profile: blankProfile(), path: null, dirty: false };
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
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.oncancel = () => resolve(null);
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return resolve(null);
      try {
        if (file.size > 8 * 1024 * 1024) throw new Error('ファイルは8 MB以下にしてください。');
        resolve({ profile: parseProfile(await file.text()), path: file.name, dirty: false });
      } catch (error) { reject(error); }
    };
    input.click();
  });
}
export async function saveProfile(profile: Profile, saveAs = false): Promise<ProfileDocument | null> {
  const snapshot = structuredClone(profile);
  if (isDesktop()) return window.__TAURI__!.core.invoke('save_profile', { profile: snapshot, saveAs });
  parseProfile(JSON.stringify(snapshot));
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'profile.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { profile: snapshot, path: 'profile.json（ダウンロード）', dirty: false };
}
