import { Link } from 'react-router-dom';
import { LinkButton } from '../components/ui/Button';
import { CALCULATORS } from '../calculators/meta';

export function NotFoundPage() {
  return (
    <div className="page container">
      <div className="prose">
        <div className="eyebrow">404</div>
        <h1 style={{ marginTop: 8 }}>That page doesn't add up.</h1>
        <p className="lead">We couldn't find what you were looking for. Try one of the calculators instead.</p>
        <ul style={{ marginTop: 'var(--sp-4)' }}>
          {CALCULATORS.map((c) => (
            <li key={c.id}>
              <Link to={`/calculators/${c.slug}`}>{c.name}</Link> — {c.tagline}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 'var(--sp-5)' }}>
          <LinkButton to="/" variant="primary">
            Back to TrueCost Lab
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
