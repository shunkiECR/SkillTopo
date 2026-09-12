import { useEffect, useRef, useState } from 'react';
import { type Skill } from './model';
import { blankProfile, initialProfile, markDirty, newProfile, openProfile, saveProfile, type ProfileDocument } from './persistence';

export function useCatalog() {
  const [doc, setDoc] = useState<ProfileDocument>(() => ({ profile: blankProfile(), path: null, dirty: false }));
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const current = useRef(doc);
  const busy = useRef(false);
  const marking = useRef<Promise<void>>(Promise.resolve());
  function accept(next: ProfileDocument) { current.current = next; setDoc(next); }

  useEffect(() => {
    let cancelled = false;
    initialProfile().then(data => {
      if (cancelled) return;
      accept(data);
      setReady(true);
    }).catch(error => { if (!cancelled) setLoadError(String(error)); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (current.current.dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  function edit(profile: ProfileDocument['profile']) {
    if (!ready || busy.current) return;
    accept({ ...current.current, profile, dirty: true });
    marking.current = markDirty();
    void marking.current.catch(error => setSaveError(String(error)));
  }
  async function run(operation: () => Promise<ProfileDocument | null>) {
    if (!ready || busy.current) return;
    busy.current = true; setSaving(true); setSaveError('');
    try {
      await marking.current;
      const next = await operation();
      if (next) accept(next);
    } catch (error) { setSaveError(String(error)); }
    finally { busy.current = false; setSaving(false); }
  }
  return {
    skills: doc.profile.skills, userName: doc.profile.userName, filePath: doc.path, dirty: doc.dirty,
    ready, loadError, saveError, saving,
    changeSkills: (change: (all: Skill[]) => Skill[]) => edit({ ...current.current.profile, skills: change(current.current.profile.skills) }),
    changeUserName: (userName: string) => edit({ ...current.current.profile, userName }),
    newFile: () => run(() => newProfile(current.current.dirty)),
    openFile: (legacy = false) => run(() => openProfile(current.current.dirty, legacy)),
    saveFile: (saveAs = false) => run(() => saveProfile(current.current.profile, saveAs)),
    clearError: () => setSaveError(''),
  };
}
