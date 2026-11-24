'use client';
import {ArrowUpRight,Bookmark,MapPin} from 'lucide-react';
import {effectiveStatus,territories,type Call,type Profile} from '@/lib/catalogue';
import {LocaleLink as Link,useLocale} from '../i18n';
export function CallCard({call,profile,ready,onFavorite}:{call:Call;profile:Profile;ready:boolean;onFavorite:()=>void}){
 const {t}=useLocale();const saved=profile.favorites.includes(call.id);
return <article className="opposition-card" key={call.id}><div className="card-top"><span className={`territory-tag territory-${territories.indexOf(call.territory)}`}><span/>{t(call.territory)}</span><div className="card-top-right"><span className="status-tag">{t(effectiveStatus(call))}</span><button type="button" disabled={!ready} className={`bookmark-button ${saved ? 'saved' : ''}`} aria-label={t(saved?'Quitar de favoritos: {title}':'Añadir a favoritos: {title}',{title:call.title})} aria-pressed={saved} onClick={onFavorite}><Bookmark size={19} fill={saved ? 'currentColor' : 'none'}/></button></div></div>
            <p className="organization">{t(call.organization)}</p><h3><Link href={`/oposiciones/${call.id}`}>{call.title}</Link></h3><div className="card-meta"><span><MapPin size={14}/>{t(call.location)}</span><span className="province-label">{t(call.province ?? 'Ámbito general / provincia sin concretar')}</span><span>{t('Grupo')} {t(call.group)}</span><span>{t(call.category)}</span></div>
            <div className="card-bottom"><Link href={`/oposiciones/${call.id}`}>{t('Ver ficha')} <ArrowUpRight size={16}/></Link></div></article>;
}
