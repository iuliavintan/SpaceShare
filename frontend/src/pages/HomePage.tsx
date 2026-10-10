import { Icon } from '../components/Icon';
import { HealthPanel } from '../features/health/HealthPanel';

const resources = [
  { number: '01', icon: 'room', title: 'Săli de studiu', description: 'Un loc liniștit pentru concentrare, lucru în echipă și idei noi.' },
  { number: '02', icon: 'lab', title: 'Laboratoare', description: 'Spații dedicate experimentelor și proiectelor care prind contur.' },
  { number: '03', icon: 'screen', title: 'Echipamente', description: 'Instrumentele potrivite, împărțite cu întreaga comunitate.' },
] as const;

export function HomePage() {
  return (
    <div className="page-shell">
      <a href="#main" className="skip-link">Sari la conținut</a>
      <header className="site-header">
        <a href="#" aria-label="SpaceShare — acasă" className="flex items-center gap-3 text-xl font-semibold tracking-tight text-forest"><span className="brand-mark"><span /><span /></span>SpaceShare<span className="text-lime">.</span></a>
        <nav aria-label="Navigare principală" className="flex items-center gap-7 text-sm"><a href="#about" className="nav-link hidden sm:block">Despre proiect</a><a href="#connection" className="nav-link flex items-center gap-2">Verifică conexiunea <Icon name="arrow" className="size-4" /></a></nav>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><span className="size-1.5 rounded-full bg-forest" /> SPAȚII COMUNE. POSIBILITĂȚI NOI.</div>
            <h1 id="hero-title">Spațiu pentru<br />ideile <span className="italic font-normal">tale.</span></h1>
            <p className="hero-description">Locul în care resursele comune devin mai ușor de găsit și de folosit. Construim o experiență simplă pentru comunitatea universitară.</p>
            <a href="#connection" className="primary-button">Verifică aplicația <Icon name="arrow" className="size-5" /></a>
            <div className="mt-8 flex items-center gap-2 text-xs text-stone-500"><span className="size-1.5 rounded-full bg-stone-400" /> Proiect în dezvoltare <span className="mx-1 text-stone-300">/</span> Etapa 01 · Fundația</div>
          </div>
          <div className="space-art" role="img" aria-label="Ilustrație geometrică a unui spațiu comun, cu o masă, scaune și o fereastră">
            <div className="art-grid" /><div className="art-window"><span /><span /><span /><span /></div>
            <div className="art-sun" /><div className="art-floor" /><div className="art-rug" />
            <div className="art-table"><span className="table-top" /><span className="table-leg one" /><span className="table-leg two" /><span className="table-book" /></div>
            <div className="art-chair chair-one"><span /><i /></div><div className="art-chair chair-two"><span /><i /></div>
            <div className="art-plant"><span /><span /><span /><i /></div>
            <div className="art-label"><span className="size-2 rounded-full bg-lime" /> Mai bine, împreună.</div>
            <span className="art-caption">THE SHARED SPACE / 01</span>
          </div>
        </section>
        <section id="about" className="about-section scroll-mt-8" aria-labelledby="about-title">
          <div className="section-heading"><div><p className="eyebrow mb-3">O COMUNITATE. MAI MULTE RESURSE.</p><h2 id="about-title">Un singur loc pentru ce ai nevoie.</h2></div><p className="max-w-xs text-sm leading-6 text-stone-500">În etapele următoare, vei putea explora și rezerva resursele organizației tale.</p></div>
          <div className="resource-grid">{resources.map((resource) => <article key={resource.number} className="resource-card"><div className="flex items-center justify-between"><Icon name={resource.icon} className="size-7 text-forest" /><span className="font-mono text-xs text-stone-400">/{resource.number}</span></div><h3 className="mt-7 text-lg font-semibold tracking-tight text-forest">{resource.title}</h3><p className="mt-2 text-sm leading-6 text-stone-500">{resource.description}</p></article>)}</div>
        </section>
        <HealthPanel />
      </main>
      <footer className="site-footer"><p>SpaceShare <span className="text-stone-300 mx-2">/</span> Spațiile ne aduc împreună.</p><span>Proiect universitar · Dezvoltat local</span></footer>
    </div>
  );
}
