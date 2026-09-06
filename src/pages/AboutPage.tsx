import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../brand/Logo';

export function AboutPage() {
  useEffect(() => {
    document.title = 'About — TrueCost Lab';
  }, []);
  return (
    <div className="page container">
      <div className="prose">
        <LogoMark size={44} />
        <h1 style={{ marginTop: 14 }}>About TrueCost Lab</h1>
        <p className="lead">TrueCost Lab is a decision engine from Cents of Adventure. It exists because the most expensive financial mistakes are rarely about the price tag — they are about everything the price tag leaves out.</p>

        <h2>What it is</h2>
        <p>A set of calculators that answer one question consistently: “what will this decision actually cost me?” Instead of comparing sticker prices or monthly payments, TrueCost models every dollar that leaves your pocket over the time you keep something, what you get back at the end, and what the difference between two choices could become if you invested it.</p>
        <p>
          Every calculator gives you the answer, the reasons behind it, the assumptions that matter most, the break-even points that would flip it, and a full “show me the math” panel. Read the <Link to="/methodology">methodology</Link> for the formulas.
        </p>

        <h2>What it is not</h2>
        <ul>
          <li>It is not financial, tax or legal advice, and it does not know your full situation.</li>
          <li>It does not use live market data. Example values are clearly labeled illustrative estimates.</li>
          <li>It does not predict investment returns. Projections use the rate you choose and are never guaranteed.</li>
        </ul>

        <h2>Privacy</h2>
        <p>There is no account and no server. Your scenarios are stored in your browser's local storage so they survive a refresh, and nowhere else. Share links contain your inputs encoded in the URL, so only the people you send a link to can see the scenario. Clearing your browser data removes your saved scenarios.</p>

        <h2>Where it's going</h2>
        <p>The engine is designed so that optional live data (fuel prices, rates), accounts with cloud-saved scenarios, and a plain-English explanation layer can be added later without changing the math. The deterministic explanations you see today (“what matters most”, “what could I be overlooking”) are generated from the model itself.</p>

        <h2>Cents of Adventure</h2>
        <p>
          Cents of Adventure is about getting more adventure per dollar — practical money and travel guidance without the hype. TrueCost Lab is the tool we reach for whenever someone asks “is it worth it?”. Visit <a href="https://centsofadventure.com" target="_blank" rel="noopener noreferrer">centsofadventure.com</a>.
        </p>
      </div>
    </div>
  );
}
