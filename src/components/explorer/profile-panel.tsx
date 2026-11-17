'use client';
import {useId,useRef,useState} from 'react';
import {ChevronDown,GraduationCap,ShieldCheck,SlidersHorizontal,Trash2} from 'lucide-react';
import {languageLevels,qualifications,universitySpecialties,isUniversitySpecialty} from '@/lib/catalogue';
import type {useProfile} from '@/lib/storage';
import {useLocale} from '../i18n';
type Props=Pick<ReturnType<typeof useProfile>,'profile'|'update'|'clear'|'ready'|'storageError'>;
export function ProfilePanel({profile,update,clear,ready,storageError}:Props){
 const {t}=useLocale();const [profileOpen,setProfileOpen]=useState(false);
 const controlId=useId();const bodyId=useId();const dialogTitleId=useId();const dialog=useRef<HTMLDialogElement>(null);
 return (
    <aside className={`profile-panel ${profileOpen ? 'is-open' : ''}`}><button type="button" className="mobile-profile" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen} aria-controls={bodyId}><SlidersHorizontal size={18}/> {t('Mi perfil')} <ChevronDown size={18}/></button><div id={bodyId} className="profile-body"><div className="panel-title"><span className="icon-square"><GraduationCap size={22}/></span><div><h2>{t("Tu punto de partida")}</h2><p>{t("Cuéntanos qué has estudiado.")}</p></div></div>
          <fieldset disabled={!ready}><legend>{t("TUS ESTUDIOS")}</legend><p className="field-help">{t("Selecciona todos los títulos que tienes.")}</p><div className="education-list">{qualifications.filter(q => !isUniversitySpecialty(q.id)).map(q => {
              const university = q.id === 'grado';
              const selected = profile.qualifications.includes(q.id) || (university && profile.qualifications.some(isUniversitySpecialty));
              return <div key={q.id} className={`education-group ${university ? 'education-university' : ''}`}><label htmlFor={`${controlId}-${q.id}`} className={`education-option ${selected ? 'selected' : ''}`}><input id={`${controlId}-${q.id}`} name="qualifications" value={q.id} type="checkbox" checked={selected} onChange={e => update({ qualifications: e.target.checked ? [...new Set([...profile.qualifications, q.id])] : profile.qualifications.filter(id => id !== q.id && (!university || !isUniversitySpecialty(id))) })}/><span>{t(university ? 'Grado / Diplomatura universitaria' : q.label)}</span></label>
                {university && selected && <fieldset className="education-specialties"><legend>{t('Titulación o especialidad')}</legend>{universitySpecialties.map(specialty => <label htmlFor={`${controlId}-${specialty.id}`} key={specialty.id} className={`education-option ${profile.qualifications.includes(specialty.id) ? 'selected' : ''}`}><input id={`${controlId}-${specialty.id}`} type="checkbox" name="university-specialties" value={specialty.id} checked={profile.qualifications.includes(specialty.id)} onChange={e => update({ qualifications: e.target.checked ? [...new Set([...profile.qualifications, 'grado' as const, specialty.id])] : [...new Set([...profile.qualifications.filter(id => id !== specialty.id), 'grado' as const])] })}/><span>{t(specialty.label)}</span></label>)}</fieldset>}
              </div>;
            })}</div></fieldset>
          <fieldset disabled={!ready} className="language-fields"><legend>{t("IDIOMAS ACREDITADOS")}</legend>{(['euskera', 'francés'] as const).map(name => <label htmlFor={`${controlId}-${name}`} className="select-label" key={name}><span>{t(name === 'euskera' ? 'Euskera' : 'Francés')}</span><select id={`${controlId}-${name}`} name={name} value={profile[name]} onChange={e => update({ [name]: e.target.value })}>{languageLevels.map(level => <option key={level} value={level}>{t(level)}</option>)}</select></label>)}<p className="field-help">{t("Los niveles son orientativos. Cada proceso determina los certificados que admite.")}</p></fieldset>
          <div className="local-note"><ShieldCheck size={18}/><p>{t('Sin cuentas ni contraseñas.')}<br/>{t('Guardamos tu selección en este navegador.')}</p></div>
          {storageError && <p className="storage-error" role="status">{t("No se pudieron recuperar o guardar los datos. Puedes seguir usando la web, pero tu selección puede no conservarse.")}</p>}
          <button type="button" disabled={!ready} className="clear-button" onClick={() => dialog.current?.showModal()}><Trash2 size={14}/> {t('Borrar mis datos guardados')}</button>
          <dialog ref={dialog} className="clear-dialog" aria-labelledby={dialogTitleId} onClose={()=>{if(dialog.current?.returnValue==='delete')clear();if(dialog.current)dialog.current.returnValue='';}}>
            <h2 id={dialogTitleId}>{t('Borrar mis datos guardados')}</h2><p>{t('Se borrarán tu perfil, búsquedas y favoritos de este navegador.')}</p>
            <form method="dialog"><button value="cancel" autoFocus>{t('Cancelar')}</button><button value="delete">{t('Borrar todo')}</button></form>
          </dialog>
        </div></aside>
 );
}
