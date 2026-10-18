import { Icon } from '../components/Icon';
import { SiteLayout } from '../components/SiteLayout';
import { StudyFloorPlan } from '../components/StudyFloorPlan';
import { useAuth } from '../features/auth/AuthProvider';
import { HealthPanel } from '../features/health/HealthPanel';

const resources = [
  { number: '01', icon: 'room', title: 'Săli de studiu', description: 'Pentru concentrare și proiecte de grup.' },
  { number: '02', icon: 'lab', title: 'Laboratoare', description: 'Locul în care ideile devin experimente.' },
  { number: '03', icon: 'screen', title: 'Echipamente', description: 'Instrumente pe care le folosim împreună.' },
] as const;

export function HomePage() {
  const { user } = useAuth();
  return (
    <SiteLayout>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">PENTRU COMUNITATEA UNIVERSITARĂ</p>
          <h1 id="hero-title">Un loc bun<br />pentru <em>ce urmează.</em></h1>
          <p className="hero-description">Spațiile în care învățăm, lucrăm și construim împreună merită să fie mai ușor de găsit.</p>
          <a className="primary-button" href={user ? '#/dashboard' : '#/register'}>
            {user ? 'Deschide dashboardul' : 'Fă parte din comunitate'} <span aria-hidden="true">↗</span>
          </a>
          <p className="small-note">Săli, laboratoare și echipamente, într-un singur loc.</p>
        </div>
        <StudyFloorPlan />
      </section>
      <section className="resources-section" aria-labelledby="resources-title">
        <div>
          <p className="eyebrow">RESURSE COMUNE</p>
          <h2 id="resources-title">Mai mult loc.<br />Mai multe posibilități.</h2>
        </div>
        <div className="resource-list">
          {resources.map((resource) => (
            <article key={resource.number} className="resource-row">
              <span className="resource-number">{resource.number}</span>
              <div><h3>{resource.title}</h3><p>{resource.description}</p></div>
              <Icon name={resource.icon} className="size-6 shrink-0" />
            </article>
          ))}
        </div>
      </section>
      <HealthPanel />
    </SiteLayout>
  );
}
