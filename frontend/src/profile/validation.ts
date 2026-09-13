import { seed, categories } from '../model';
import { MAX_PROFILE_BYTES, type Profile } from './types';

/** 新規・不足項目の補完ではデモ評価を引き継がない。 */
export function blankProfile(): Profile {
  return {
    format: 'skilltopo-profile',
    version: 1,
    userName: '未設定',
    skills: structuredClone(seed).map((s) => ({
      ...s,
      level: null,
      interest: 0,
      lastUsed: '',
      pinned: false,
      notes: '',
    })),
  };
}

/** 値を検証し、不足する標準IDだけを未評価で補完する。既存IDの内容は保持する。 */
export function parseProfile(text: string): Profile {
  if (new TextEncoder().encode(text).length > MAX_PROFILE_BYTES)
    throw new Error('ファイルは8 MB以下にしてください。');
  const p = JSON.parse(text.replace(/^\uFEFF/, ''));
  if (
    !p ||
    p.format !== 'skilltopo-profile' ||
    p.version !== 1 ||
    typeof p.userName !== 'string' ||
    !p.userName.trim() ||
    [...p.userName].length > 80 ||
    !Array.isArray(p.skills) ||
    !p.skills.length ||
    p.skills.length > 500
  )
    throw new Error('プロフィール形式・ユーザー名・スキル数が不正です。');
  const ids = new Set<string>();
  for (const s of p.skills) {
    // 名前はUnicodeコードポイント数、説明・メモはUTF-8バイト数で制限する。
    // HTMLのmaxLength（UTF-16単位）だけに頼らず、ファイルからの値も検証する。
    if (
      !s ||
      typeof s.id !== 'string' ||
      !s.id ||
      ids.has(s.id) ||
      typeof s.name !== 'string' ||
      !s.name.trim() ||
      [...s.name].length > 40 ||
      !categories.some((c) => c.id === s.category) ||
      !(s.level === null || (Number.isInteger(s.level) && s.level >= 0 && s.level <= 4)) ||
      !Number.isInteger(s.interest) ||
      s.interest < 0 ||
      s.interest > 4 ||
      typeof s.description !== 'string' ||
      new TextEncoder().encode(s.description).length > 12000 ||
      typeof s.notes !== 'string' ||
      new TextEncoder().encode(s.notes).length > 24000 ||
      typeof s.pinned !== 'boolean' ||
      typeof s.lastUsed !== 'string' ||
      (s.lastUsed !== '' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(s.lastUsed)) ||
      !Array.isArray(s.related) ||
      s.related.some((id: unknown) => typeof id !== 'string')
    )
      throw new Error('スキルの値が不正です。');
    ids.add(s.id);
  }
  const profile: Profile = {
    ...p,
    skills: [...p.skills, ...blankProfile().skills.filter((s) => !ids.has(s.id))],
  };
  // 補完される標準スキルへの参照も許可するため、参照検証は補完後に行う。
  const all = new Set(profile.skills.map((s) => s.id));
  if (
    profile.skills.length > 500 ||
    profile.skills.some((s) => s.related.some((id) => !all.has(id) || id === s.id))
  )
    throw new Error('関連スキルの参照が不正です。');
  return profile;
}
