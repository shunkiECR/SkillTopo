import { useEffect, useRef, useState } from 'react';
import { type Skill } from './model';
import {
  blankProfile,
  initialProfile,
  markDirty,
  newProfile,
  openProfile,
  saveProfile,
  type ProfileDocument,
  type FileFormat,
} from './persistence';

/** 編集中プロフィールの唯一の更新窓口。自動保存は行わない。 */
export function useCatalog() {
  const [doc, setDoc] = useState<ProfileDocument>(() => ({
    profile: blankProfile(),
    path: null,
    dirty: false,
  }));
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  // 非同期コールバックにも最新値を渡す。accept で描画用stateと必ず同時更新する。
  const current = useRef(doc);
  // ref は同じイベント内の連打も防止し、saving はボタンと inert の表示制御に使う。
  const busy = useRef(false);
  const marking = useRef<Promise<void>>(Promise.resolve());
  function accept(next: ProfileDocument) {
    current.current = next;
    setDoc(next);
  }

  useEffect(() => {
    let cancelled = false;
    initialProfile()
      .then((data) => {
        if (cancelled) return;
        accept(data);
        setReady(true);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (current.current.dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  function edit(profile: ProfileDocument['profile']) {
    if (!ready || busy.current) return;
    accept({ ...current.current, profile, dirty: true });
    marking.current = markDirty();
    void marking.current.catch((error) => setSaveError(String(error)));
  }
  async function run(operation: () => Promise<ProfileDocument | null>) {
    if (!ready || busy.current) return;
    busy.current = true;
    setSaving(true);
    setSaveError('');
    try {
      // Rust側の破棄確認が古いdirtyを見ないよう、通知完了後にファイル操作する。
      await marking.current;
      const next = await operation();
      // null はダイアログのキャンセル。現在の編集内容と保存先をそのまま維持する。
      if (next) accept(next);
    } catch (error) {
      setSaveError(String(error));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return {
    skills: doc.profile.skills,
    userName: doc.profile.userName,
    filePath: doc.path,
    dirty: doc.dirty,
    ready,
    loadError,
    saveError,
    saving,
    changeSkills: (change: (all: Skill[]) => Skill[]) =>
      edit({ ...current.current.profile, skills: change(current.current.profile.skills) }),
    changeUserName: (userName: string) => edit({ ...current.current.profile, userName }),
    newFile: () => run(() => newProfile(current.current.dirty)),
    openFile: (legacy = false) => run(() => openProfile(current.current.dirty, legacy)),
    saveFile: (saveAs = false, format: FileFormat = 'binary') =>
      run(() => saveProfile(current.current.profile, saveAs, format)),
    clearError: () => setSaveError(''),
  };
}

/** UIは必要な操作だけを Pick して受け取る。保存対象を直接書き換えない。 */
export type CatalogController = ReturnType<typeof useCatalog>;
