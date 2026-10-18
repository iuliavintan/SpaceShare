import { useCallback, useState, type FormEvent } from 'react';
import { SiteLayout } from '../components/SiteLayout';
import { resourcesApi } from '../features/resources/resources.api';
import { useRemoteData } from '../features/resources/useRemoteData';
import { ActionFeedback, useResourceAction } from '../features/resources/useResourceAction';
import type { Category, ResourceFilters } from '../features/resources/resources.types';

function CategoriesEditor({ categories, onSaved }: { categories: Category[]; onSaved: () => void }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const action = useResourceAction();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await action.run(() => resourcesApi.saveCategory(name, id || undefined), 'Categoria a fost salvată.');
    if (result.ok) { setId(''); setName(''); onSaved(); }
  }
  return <section className="category-editor" aria-labelledby="categories-title">
    <div><p className="eyebrow">ORGANIZARE</p><h2 id="categories-title">Categorii</h2><p className="small-note mt-3">Creează sau redenumește categoriile resurselor.</p></div>
    <form className="management-form" onSubmit={save}>
      <fieldset disabled={action.busy} className="category-fields">
        <label className="form-field">Categorie<select value={id} onChange={(event) => { setId(event.target.value); setName(categories.find((item) => item.id === event.target.value)?.name ?? ''); }}><option value="">Categorie nouă</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="form-field">Nume<input value={name} required maxLength={80} onChange={(event) => setName(event.target.value)} /></label>
        <button className="secondary-button" type="submit">{action.busy ? 'Se salvează…' : 'Salvează categoria'}</button>
      </fieldset>
      <ActionFeedback error={action.error} message={action.message} />
    </form>
  </section>;
}

export function ResourcesPage({ manage = false }: { manage?: boolean }) {
  const initialFilters: ResourceFilters = { q: '', categoryId: '', location: '', minCapacity: '', requiresApproval: '', status: manage ? 'all' : 'active', page: 1 };
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const load = useCallback((signal: AbortSignal) => resourcesApi.list(filters, signal), [filters]);
  const list = useRemoteData(load);
  const categories = useRemoteData(resourcesApi.categories);
  const action = useResourceAction();
  function apply(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setFilters({ ...draft, page: 1 }); }
  const reset = () => { setDraft(initialFilters); setFilters(initialFilters); };
  const detailPath = manage ? '#/admin/resources/' : '#/resources/';

  return <SiteLayout mainClassName="catalog-page">
    <div className="catalog-heading">
      <div><p className="eyebrow">{manage ? 'ADMINISTRARE / RESURSE' : 'CATALOGUL COMUNITĂȚII'}</p><h1 className="page-title">{manage ? <>Resurse bine<br /><em>organizate.</em></> : <>Un loc pentru<br /><em>ce ai plănuit.</em></>}</h1></div>
      <div className="catalog-heading-aside"><p>{manage ? 'Gestionează resursele, programul și perioadele de indisponibilitate.' : 'Descoperă spațiile și echipamentele comune ale organizației.'}</p>{manage && <a href="#/admin/resources/new" className="primary-button mt-5">Adaugă resursă <span aria-hidden="true">↗</span></a>}</div>
    </div>
    <form className="resource-filters management-form" onSubmit={apply} aria-label="Filtre resurse">
      <label className="form-field">Caută o resursă<input type="search" maxLength={120} placeholder="Nume, descriere, locație" value={draft.q} onChange={(event) => setDraft({ ...draft, q: event.target.value })} /></label>
      <label className="form-field">Categorie<select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}><option value="">Toate categoriile</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="form-field">Locație<input maxLength={120} placeholder="Clădire sau etaj" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
      <label className="form-field">Capacitate minimă<input type="number" min={1} max={100000} value={draft.minCapacity} onChange={(event) => setDraft({ ...draft, minCapacity: event.target.value })} /></label>
      <label className="form-field">Aprobare<select value={draft.requiresApproval} onChange={(event) => setDraft({ ...draft, requiresApproval: event.target.value })}><option value="">Orice tip</option><option value="false">Automată</option><option value="true">Manuală</option></select></label>
      {manage && <label className="form-field">Vizibilitate<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="all">Toate resursele</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}
      <div className="filter-actions"><button type="submit" className="primary-button" disabled={list.loading}>Caută</button><button type="button" className="text-button" onClick={reset}>Resetează</button></div>
    </form>
    {categories.error && <div className="form-feedback error" role="alert">{categories.error} <button className="text-button" onClick={categories.reload}>Reîncarcă categoriile</button></div>}
    <ActionFeedback error={action.error} message={action.message} />
    <div className="catalog-results" aria-live="polite">
      {list.loading ? <p role="status" className="small-note">Se încarcă resursele…</p> : list.error ? <><p className="form-feedback error" role="alert">{list.error}</p><button className="secondary-button mt-4" onClick={list.reload}>Încearcă din nou</button></> : list.data && <>
        <p className="eyebrow results-count">{list.data.total} {list.data.total === 1 ? 'RESURSĂ' : 'RESURSE'}</p>
        {!list.data.resources.length && <div className="empty-state"><h2>Nicio resursă găsită.</h2><p>Încearcă alte filtre sau revino la lista completă.</p><button className="secondary-button mt-5" onClick={reset}>Resetează filtrele</button></div>}
        {list.data.resources.map((resource, index) => <article key={resource.id} className="catalog-row">
          <span className="catalog-number">{String((list.data!.page - 1) * list.data!.pageSize + index + 1).padStart(2, '0')}</span>
          <div className="catalog-resource-info"><div className="flex flex-wrap items-center gap-3"><p className="eyebrow text-muted">{resource.category.name}</p>{!resource.isActive && <span className="resource-badge inactive">Inactivă</span>}</div><h2><a href={`${detailPath}${encodeURIComponent(resource.id)}`}>{resource.name}</a></h2><p className="resource-summary">{resource.description}</p><div className="resource-meta"><span>{resource.location}</span><span className="capacity-highlight"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M1.8 16v-1.2a4.2 4.2 0 0 1 4.2-4.2h2a4.2 4.2 0 0 1 4.2 4.2V16H1.8Z" stroke="currentColor" strokeWidth="1.5"/><path d="M13 3.2a3 3 0 0 1 0 5.7m1.2 2a4.2 4.2 0 0 1 4 4.2V16h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg><strong>Max. {resource.capacity} {resource.capacity === 1 ? 'persoană' : 'persoane'}</strong></span><span>Aprobare {resource.requiresApproval ? 'manuală' : 'automată'}</span></div><div className="facilities-list">{resource.facilities.map((facility) => <span key={facility}>{facility}</span>)}</div></div>
          <div className="catalog-row-actions"><a href={`${detailPath}${encodeURIComponent(resource.id)}`} className="back-link">{manage ? 'Gestionează' : 'Vezi detalii'} ↗</a>{manage && <button type="button" disabled={action.busy} className="text-button" onClick={async () => {
            const result = await action.run(() => resourcesApi.update(resource.id, { isActive: !resource.isActive }), resource.isActive ? 'Resursa a fost dezactivată. Istoricul este păstrat.' : 'Resursa este din nou vizibilă în catalog.');
            if (result.ok) list.reload();
          }}>{resource.isActive ? 'Dezactivează' : 'Reactivează'}</button>}</div>
        </article>)}
        {list.data.total > list.data.pageSize && <nav className="pagination" aria-label="Pagini catalog"><button className="secondary-button" disabled={list.data.page <= 1} onClick={() => setFilters({ ...filters, page: list.data!.page - 1 })}>← Înapoi</button><span>Pagina {list.data.page} din {Math.ceil(list.data.total / list.data.pageSize)}</span><button className="secondary-button" disabled={list.data.page * list.data.pageSize >= list.data.total} onClick={() => setFilters({ ...filters, page: list.data!.page + 1 })}>Înainte →</button></nav>}
      </>}
    </div>
    {manage && categories.data && <CategoriesEditor categories={categories.data} onSaved={() => { categories.reload(); list.reload(); }} />}
  </SiteLayout>;
}
