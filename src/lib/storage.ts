'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultProfile, profileSchema, type Profile } from './catalogue';
export const STORAGE_KEY = 'oposaketia:profile:v1';
const EVENT = 'oposaketia:profile-change';
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const current = useRef<Profile>(defaultProfile);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? profileSchema.safeParse(JSON.parse(raw)) : null;
        current.current = parsed?.success ? parsed.data : defaultProfile;
        setProfile(current.current);
        setStorageError(Boolean(raw && !parsed?.success));
      } catch { setStorageError(true); }
      setReady(true);
    }
    const sync = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) read(); };
    read(); window.addEventListener('storage', sync); window.addEventListener(EVENT, read);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(EVENT, read); };
  }, []);
  const update = useCallback((patch: Partial<Profile>) => {
    const next = profileSchema.parse({ ...current.current, ...patch });
    current.current = next;
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError(false);
      window.dispatchEvent(new Event(EVENT));
    } catch { setStorageError(true); }
  }, []);
  const clear = useCallback(() => {
    current.current = defaultProfile;
    setProfile(defaultProfile);
    try { localStorage.removeItem(STORAGE_KEY); setStorageError(false); window.dispatchEvent(new Event(EVENT)); }
    catch { setStorageError(true); }
  }, []);
  return { profile, update, clear, ready, storageError };
}
