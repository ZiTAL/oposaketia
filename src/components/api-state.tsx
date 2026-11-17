'use client';
import {useLocale} from './i18n';
export function ApiState({loading,error,retry}:{loading:boolean;error:boolean;retry:()=>void}){
 const {t}=useLocale();
 if(loading)return <div className="api-loading"><progress className="visually-hidden" aria-label={t('Cargando datos…')}/><div className="api-progress" aria-hidden="true"><span/></div><p>{t('Cargando datos…')}</p></div>;
 if(error)return <div className="error-notice" role="alert">{t('No hemos podido cargar los datos.')} <button type="button" onClick={retry}>{t('Volver a intentar')}</button></div>;
 return null;
}
