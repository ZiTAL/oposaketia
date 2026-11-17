'use client';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Header } from './header';
import { LocaleLink as Link, useLocale } from './i18n';
import { sourceListSchema } from '@/lib/api/contracts';
import { useApi } from '@/lib/use-api';
import { ApiState } from './api-state';
export function SourcesView(){
 const {data,loading,error,retry}=useApi('/sources',sourceListSchema);
 const {t,date}=useLocale();const format=(value:string)=>date(value,{dateStyle:'medium',timeStyle:'short'});
 return <><Header/><main className="shell detail" id="contenido"><Link href="/" className="back-link"><ArrowLeft size={15}/>{t('Volver al buscador')}</Link><h1>{t('Fuentes y cobertura')}</h1><p className="detail-note">{t('El catálogo se actualiza automáticamente cada seis horas. La cobertura es parcial: no reúne todavía todas las oposiciones de los tres territorios. Una consulta automática no equivale a una revisión de las bases.')}</p>{<ApiState loading={loading} error={error} retry={retry}/>} {(data?.sources??[]).map(source=>{
 const report=source.report;const stale=report?.last_success?Date.now()-Date.parse(report.last_success)>48*3600000:true;
 return <section key={source.id} className="detail-section"><h2>{t(source.name)}</h2><p>{t(source.coverage)}</p><p><strong>{t('Última importación con datos:')}</strong> {report?.last_success?format(report.last_success):t('Todavía no registrada')}{stale?' · '+t('Pendiente de actualizar'):''}<br/><strong>{t('Último intento:')}</strong> {report?format(report.attemptedAt):t('No registrado')}<br/><strong>{t('Resultado:')}</strong> {t(!report?'Sin consultar':report.status==='ok'?'Correcto':report.status==='partial'?'Parcial · {count} incidencias':'No se pudo actualizar; se conservan las fichas anteriores',{count:report?.warningCount??0})}{report&&<><br/><strong>{t('Fichas en el último intento:')}</strong> {report.count}</>}</p><a className="back-link" href={source.url} target="_blank" rel="noopener noreferrer">{t('Consultar fuente oficial')} <ArrowUpRight size={14}/></a></section>;
 })}<section className="detail-section"><h2>{t('Cómo interpretar las fichas')}</h2>{['Los temarios se enlazan al documento oficial. Cuando se reconoce su estructura, mostramos también los temas extraídos; comprueba el original para consultar todos los apartados y las posibles correcciones. Un enlace a una guía general no sustituye al programa de una convocatoria concreta.','Si no podemos extraer una titulación, un idioma o una fecha con suficiente claridad, lo indicamos como pendiente de comprobar. No calculamos plazos relativos contando días hábiles ni convertimos automáticamente perfiles lingüísticos en niveles europeos.','Las fichas antiguas se conservan si una fuente deja de responder. La fecha de consulta permite identificar información que puede necesitar actualización.'].map(key=><p key={key}>{t(key)}</p>)}</section></main></>;
}
