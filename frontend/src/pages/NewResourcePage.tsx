import { SiteLayout } from '../components/SiteLayout';
import { resourcesApi } from '../features/resources/resources.api';
import { useRemoteData } from '../features/resources/useRemoteData';
import { ResourceForm } from '../features/resources/ResourceForm';

export function NewResourcePage() {
  const categories = useRemoteData(resourcesApi.categories);
  return <SiteLayout mainClassName="catalog-page"><a href="#/admin/resources" className="back-link">← Administrare resurse</a><div className="resource-detail-heading"><div><p className="eyebrow">ADMINISTRARE / RESURSĂ NOUĂ</p><h1 className="page-title">Mai mult loc<br />pentru <em>comunitate.</em></h1></div></div>
    {categories.loading ? <p role="status">Se încarcă categoriile…</p> : categories.error ? <><p role="alert" className="form-feedback error">{categories.error}</p><button className="secondary-button mt-4" onClick={categories.reload}>Încearcă din nou</button></> : categories.data?.length ? <ResourceForm categories={categories.data} onSaved={(resource) => { window.location.hash = `/admin/resources/${encodeURIComponent(resource.id)}`; }} /> : <p className="small-note">Adaugă întâi o categorie din pagina de administrare.</p>}
  </SiteLayout>;
}
