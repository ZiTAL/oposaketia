'use client';
import { useLocale } from './i18n';
import { Bookmark } from 'lucide-react';
import { useProfile } from '@/lib/storage';
export function SaveButton({ id }: { id: string }) {
  const {t}=useLocale();
  const { profile, update, ready, storageError } = useProfile();
  const saved = profile.favorites.includes(id);
  return <div><button className="detail-save" disabled={!ready} aria-pressed={saved} onClick={() => update({ favorites: saved ? profile.favorites.filter(item => item !== id) : [...profile.favorites, id] })}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'}/>{t(saved ? 'Guardada' : 'Guardar oposición')}</button>{storageError && <p role="status">{t('No se pudo guardar la selección en el navegador.')}</p>}</div>;
}
