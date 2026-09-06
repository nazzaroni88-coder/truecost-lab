import { Link } from 'react-router-dom';
import { LogoMark, Wordmark } from '../../brand/Logo';
import { CALCULATORS } from '../../calculators/meta';
import { DATA_REVIEWED } from '../../data/incentives';
import { STATE_DATA_REVIEWED } from '../../data/stateDefaults';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "September 2026" -> a sortable number. Returns null for anything unparseable. */
function monthKey(s: string): number | null {
  const [month, year] = s.split(' ');
  const m = MONTHS.indexOf(month);
  const y = Number(year);
  return m < 0 || !Number.isFinite(y) ? null : y * 12 + m;
}

/**
 * The OLDEST review date across the reference datasets, not the newest.
 *
 * This line used to hardcode its own date, which is the exact failure the data files warn about:
 * updating incentives.ts or stateDefaults.ts would refresh their constants while this footer went
 * on claiming a freshness nobody had checked. It happened to agree today, which is precisely why it
 * would have gone unnoticed until it did not.
 *
 * Oldest rather than newest because the claim is "everything here was reviewed at least this
 * recently" — quoting the newest would let one updated file vouch for a stale one.
 */
function oldestReview(): string {
  const dates = [DATA_REVIEWED, STATE_DATA_REVIEWED];
  const keyed = dates.map((d) => ({ d, k: monthKey(d) })).filter((x): x is { d: string; k: number } => x.k !== null);
  if (keyed.length === 0) return dates[0];
  return keyed.reduce((a, b) => (b.k < a.k ? b : a)).d;
}

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
            A <a href="https://www.centsofadventure.me" target="_blank" rel="noopener noreferrer">Cents of Adventure</a> tool for understanding what big decisions actually cost.
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
              <a href="https://www.centsofadventure.me" target="_blank" rel="noopener noreferrer">
                centsofadventure.me
              </a>
            </li>
          </ul>
          <p style={{ marginTop: 14 }} className="micro">
            Your scenarios are saved only in this browser. Nothing is sent to a server.
          </p>
          <p className="micro" style={{ marginTop: 6 }}>
            TrueCost Lab v0.1 · Example values last reviewed {oldestReview()}
          </p>
        </div>
      </div>
    </footer>
  );
}
