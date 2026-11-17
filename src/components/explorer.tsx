'use client';
import { LocaleLink as Link, useLocale } from './i18n';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Search, ShieldCheck, X } from 'lucide-react';
import { filterCalls, provinceChoices, statusChoices, categoryChoices } from '@/lib/catalogue';
import { iparraldeProvinces } from '@/lib/geography';
import { useProfile } from '@/lib/storage';
import { useCatalogue } from '@/lib/use-catalogue';
import { sortCalls, type ExplorerSort } from '@/lib/explorer-sort';
import { ProfilePanel } from './explorer/profile-panel';
import { ApiState } from './api-state';
import { CheckboxFilter } from './explorer/checkbox-filter';
import { ResultTabs } from './explorer/result-tabs';
import { CallCard } from './explorer/call-card';

export function Explorer() {
  const {calls,loading,unavailable,retry}=useCatalogue();
  const {t,locale}=useLocale();
  const { profile, update, clear, ready, storageError } = useProfile();
  const [tab, setTab] = useState<'all' | 'saved'>('all');
  const [sort, setSort] = useState<ExplorerSort>('status');
  const [page, setPage] = useState(1);
  const selectedIparralde = profile.provinces.filter(province => iparraldeProvinces.some(value => value === province));
  const pendingIparralde = !loading && !unavailable && selectedIparralde.length > 0 && selectedIparralde.every(province => !calls.some(call => call.province === province));
  const demo = calls.some(call => call.isDemo);
  const visible = useMemo(() => sortCalls(filterCalls(calls, profile, tab === 'saved', t), sort, locale), [calls, profile, tab, sort, locale]);
  const [announcedCount,setAnnouncedCount]=useState(0);
  useEffect(()=>{const timer=setTimeout(()=>setAnnouncedCount(visible.length),200);return()=>clearTimeout(timer);},[visible.length]);
  useEffect(() => { setPage(1); }, [profile.search, profile.provinces, profile.categories, profile.statuses, profile.onlyMatches, profile.qualifications, profile.euskera, profile.francés, tab, sort]);
  const pageCount = Math.max(1, Math.ceil(visible.length / 20));
  const currentPage = Math.min(page, pageCount);
  const paginated = visible.slice((currentPage - 1) * 20, currentPage * 20);
  function changePage(next: number) { setPage(next); const results=document.getElementById('result-list');results?.scrollIntoView({behavior:'instant',block:'start'});results?.focus({preventScroll:true}); }
  function rememberSearch() {
    const text = profile.search.trim();
    if (text) update({ recent: [text, ...profile.recent.filter(item => item !== text)].slice(0, 8) });
  }
  function favorite(id: string) { update({ favorites: profile.favorites.includes(id) ? profile.favorites.filter(item => item !== id) : [...profile.favorites, id] }); }
  return <>
    <section className="shell workspace" id="buscador">
      {demo && <div className="demo-notice"><span className="notice-tag">{t("VERSIÓN INICIAL")}</span><p>{t("Estás explorando")} <strong>{t("datos de ejemplo")}</strong>{t('. Las plazas, requisitos y temas son ilustrativos; todavía no hay convocatorias oficiales importadas.')}</p></div>}
      {!demo && !unavailable && !loading && <div className="source-notice"><ShieldCheck size={18}/><p>{t("Catálogo de")} <strong>{t("fuentes oficiales")}</strong>{t(', consultado automáticamente. Cobertura parcial; los calendarios franceses son regionales y provisionales.')} <Link href="/fuentes">{t("Ver fuentes y actualización ↗")}</Link></p></div>}
      <ApiState loading={loading} error={unavailable} retry={retry}/><h1 className="visually-hidden">{t("Explorar oposiciones")}</h1>
      <div className="explorer-grid">
        <ProfilePanel profile={profile} update={update} clear={clear} ready={ready} storageError={storageError}/>
        <div className="results-panel"><ResultTabs tab={tab} onChange={setTab} total={calls.length} saved={calls.filter(call=>profile.favorites.includes(call.id)).length}/>
          <search><label className="search-field-label" htmlFor="call-search">{t("Buscar por puesto, administración o localidad")}</label><form action="/" method="get" onSubmit={e => { e.preventDefault(); rememberSearch(); }} className="search-bar"><Search size={20}/><input id="call-search" name="q" type="search" maxLength={200} autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={!ready} placeholder={t("Puesto, administración o localidad…")} value={profile.search} onChange={e => update({ search: e.target.value })}/>{profile.search && <button type="button" onClick={() => update({ search: '' })} aria-label={t("Limpiar búsqueda")}><X size={16}/></button>}<button type="submit" className="search-submit">{t("Buscar")} <ArrowRight size={16}/></button></form></search>
          {profile.recent.length > 0 && <div className="recent-searches"><span>{t("Recientes:")}</span>{profile.recent.slice(0, 3).map(text => <button key={text} onClick={() => update({ search: text })}>{text}</button>)}</div>}
          <CheckboxFilter legend="Provincias" choices={provinceChoices} selected={profile.provinces} onChange={values=>update({ provinces:values })} ready={ready} allLabel="Todas"/>
          {pendingIparralde && <p className="iparralde-note">{t('Todavía no hay fichas con provincia confirmada para las provincias de Iparralde seleccionadas. Los calendarios regionales siguen en «Ámbito general / sin concretar».')} <button type="button" onClick={()=>update({provinces:profile.provinces.includes('Sin concretar')?profile.provinces:[...profile.provinces,'Sin concretar']})}>{t("Incluir ámbito general")}</button></p>}
          <CheckboxFilter legend="Estados" choices={statusChoices} selected={profile.statuses} onChange={values=>update({ statuses:values })} ready={ready} allLabel="Todos"/>
          <CheckboxFilter legend="Categorías" choices={categoryChoices} selected={profile.categories} onChange={values=>update({ categories:values })} ready={ready} allLabel="Todas"/>
          <label className="match-switch"><input type="checkbox" disabled={!ready} checked={profile.onlyMatches} onChange={e => update({ onlyMatches: e.target.checked })}/><span className="switch"/><span>{t("Solo coincidencias con mis estudios e idiomas")}</span></label>
          <div className="result-count"><p role="status" aria-atomic="true"><strong>{announcedCount}</strong> {t(announcedCount === 1 ? 'oposición' : 'oposiciones')}{demo ? t(' de ejemplo') : ''}</p><label>{t("Ordenar por")} <select aria-label={t("Ordenar resultados")} value={sort} onChange={e => setSort(e.target.value as ExplorerSort)}><option value="status">{t("Estado y plazo")}</option><option value="title">{t("Nombre")}</option><option value="province">{t("Provincia")}</option></select></label></div>
          <h2 className="visually-hidden">{t("Resultados")}</h2><div id="result-list" role="tabpanel" aria-labelledby={tab === 'all' ? 'tab-all' : 'tab-saved'} aria-busy={loading} tabIndex={-1} className="cards">{paginated.map(call=><CallCard key={call.id} call={call} profile={profile} ready={ready} onFavorite={()=>favorite(call.id)}/>) }</div>
          {pageCount>1 && <nav className="pagination" aria-label={t("Páginas de resultados")}><button disabled={currentPage===1} onClick={()=>changePage(currentPage-1)}>{t("← Anterior")}</button><span>{t('Página {page} de {pages} · {count} resultados',{page:currentPage,pages:pageCount,count:visible.length})}</span><button disabled={currentPage===pageCount} onClick={()=>changePage(currentPage+1)}>{t("Siguiente →")}</button></nav>}
          {!visible.length && !unavailable && !loading && <div className="empty-state"><BookOpen size={36}/><h3>{t(tab === 'saved' ? 'Aquí empieza tu selección' : 'Vamos a ampliar la búsqueda')}</h3><p>{t(tab === 'saved' ? 'Guarda las oposiciones que te interesen pulsando el marcador de cada ficha. Comprueba también los filtros activos.' : 'Prueba otro puesto o provincia. También puedes desactivar el filtro de coincidencias.')}</p><button onClick={() => { update({ search: '', provinces: [], categories: [], statuses: [], onlyMatches: false }); setTab('all'); }}>{t('Ver todas las oposiciones')} <ArrowRight size={16}/></button></div>}
          {profile.onlyMatches && profile.qualifications.length === 0 && <p className="field-help">{t("Selecciona al menos una titulación en tu perfil para obtener coincidencias.")}</p>}
        </div>
      </div>
    </section>
  </>;
}
