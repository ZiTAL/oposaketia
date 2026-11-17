'use client';
import {useId} from 'react';
import {useLocale} from '../i18n';
export function CheckboxFilter<T extends string>({legend,choices,selected,onChange,ready,allLabel='Todas'}:{legend:string;choices:readonly T[];selected:readonly T[];onChange:(values:T[])=>void;ready:boolean;allLabel?:string}){
 const {t}=useLocale();const groupId=useId();
 return <fieldset className="province-filter" disabled={!ready}><legend>{t(legend)}</legend><div className="province-options"><button type="button" aria-pressed={!selected.length} className={!selected.length?'province-all selected':'province-all'} onClick={()=>onChange([])}>{t(allLabel)}</button>{choices.map((value,index)=><label htmlFor={`${groupId}-${index}`} key={value} className={`province-choice ${selected.includes(value)?'selected':''}`}><input id={`${groupId}-${index}`} name={legend} value={value} type="checkbox" checked={selected.includes(value)} onChange={event=>onChange(event.target.checked?[...selected,value]:selected.filter(item=>item!==value))}/><span>{t(value==='Sin concretar'?'Ámbito general / sin concretar':value)}</span></label>)}</div></fieldset>;
}
