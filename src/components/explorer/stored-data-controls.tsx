'use client';
import {useId,useRef} from 'react';
import {ShieldCheck,Trash2} from 'lucide-react';
import type {useProfile} from '@/lib/storage';
import {useLocale} from '../i18n';

type Props=Pick<ReturnType<typeof useProfile>,'clear'|'ready'|'storageError'>;

export function StoredDataControls({clear,ready,storageError}:Props){
 const {t}=useLocale();const titleId=useId();const dialog=useRef<HTMLDialogElement>(null);
 return <div className="stored-data-controls">
   <p><ShieldCheck size={16} aria-hidden="true"/>{t('Sin cuentas ni contraseñas.')} {t('Guardamos tus búsquedas, filtros y favoritos en este navegador.')}</p>
   {storageError&&<p className="storage-error" role="status">{t('No se pudieron recuperar o guardar los datos. Puedes seguir usando la web, pero tu selección puede no conservarse.')}</p>}
   <button type="button" disabled={!ready} onClick={()=>dialog.current?.showModal()}><Trash2 size={15} aria-hidden="true"/>{t('Borrar mis datos guardados')}</button>
   <dialog ref={dialog} className="clear-dialog" aria-labelledby={titleId} onClose={()=>{if(dialog.current?.returnValue==='delete')clear();if(dialog.current)dialog.current.returnValue='';}}>
     <h2 id={titleId}>{t('Borrar mis datos guardados')}</h2><p>{t('Se borrarán tus búsquedas, filtros y favoritos de este navegador.')}</p>
     <form method="dialog"><button value="cancel" autoFocus>{t('Cancelar')}</button><button value="delete">{t('Borrar todo')}</button></form>
   </dialog>
 </div>;
}
