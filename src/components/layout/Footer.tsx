import { Link } from 'react-router-dom';
import { LogoMark, Wordmark } from '../../brand/Logo';
import { CALCULATORS } from '../../calculators/meta';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div>
          <Link to="/" className="brand-link" style={{ marginBottom: 10 }}>
            <LogoMark size={26} />
            <Wordmark withBy={false} />
          </Link>
          <p>
            A <a href="https://centsofadventure.com" target="_blank" rel="noopener noreferrer">Cents of Adventure</a> tool for understanding what big decisions actually cost.
          </p>
          <p className="footer-disclaimer">TrueCost Lab is educational. Results are estimates based on the assumptions you enter. Projected investment returns are illustrative and never guaranteed. Nothing here is personalized financial, tax, or legal advice.</p>
        </div>
        <div>
          <h4>Calculators</h4>
          <ul>
            {CALCULATORS.map((c) => (
              <li key={c.id}>
                <Link to={`/calculators/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>About</h4>
          <ul>
            <li>
              <Link to="/methodology">Methodology &amp; formulas</Link>
            </li>
            <li>
              <Link to="/about">About TrueCost Lab</Link>
            </li>
            <li>
              <Link to="/#faq">FAQ</Link>
            </li>
            <li>
              <a href="https://centsofadventure.com" target="_blank" rel="noopener noreferrer">
                centsofadventure.com
              </a>
            </li>
          </ul>
          <p style={{ marginTop: 14 }} className="micro">
            Your scenarios are saved only in this browser. Nothing is sent to a server.
          </p>
          <p className="micro" style={{ marginTop: 6 }}>
            TrueCost Lab v0.1 · Example values last reviewed September 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
