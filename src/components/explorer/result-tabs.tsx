'use client';
import {useRef,type KeyboardEvent} from 'react';
import {Bookmark} from 'lucide-react';
import {useLocale} from '../i18n';
export function ResultTabs({tab,onChange,total,saved}:{tab:'all'|'saved';onChange:(value:'all'|'saved')=>void;total:number;saved:number}){
 const {t}=useLocale();const all=useRef<HTMLButtonElement>(null),favorites=useRef<HTMLButtonElement>(null);
 function navigate(event:KeyboardEvent){if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'all':event.key==='End'?'saved':tab==='all'?'saved':'all';onChange(next);(next==='all'?all:favorites).current?.focus();}
 return <div className="results-tabs" role="tablist" aria-label={t('Vista de convocatorias')} onKeyDown={navigate}><button type="button" ref={all} id="tab-all" role="tab" tabIndex={tab==='all'?0:-1} aria-selected={tab==='all'} aria-controls="result-list" onClick={()=>onChange('all')} className={tab==='all'?'active':''}>{t('Todas las oposiciones')} <span>{total}</span></button><button type="button" ref={favorites} id="tab-saved" role="tab" tabIndex={tab==='saved'?0:-1} aria-selected={tab==='saved'} aria-controls="result-list" onClick={()=>onChange('saved')} className={tab==='saved'?'active':''}><Bookmark size={15} aria-hidden="true"/> {t('Guardadas')} <span>{saved}</span></button></div>;
}
