import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getCalculatorBySlug, type AnyCalculator } from '../calculators/registry';
import type { Preset, ShareSummary } from '../calculators/types';
import { CALCULATORS } from '../calculators/meta';
import { useScenarios } from '../scenarios/store';
import { decodeShare } from '../scenarios/urlCodec';
import { Button, IconButton } from '../components/ui/Button';
import { CalcIcon, IconCheck, IconCompare, IconDuplicate, IconMore, IconPlus, IconRename, IconReset, IconSwap, IconTrash, IconArrowRight, IconWarning } from '../components/ui/Icons';
import { Modal } from '../components/ui/Modal';
import { Segmented, TextField } from '../components/ui/Controls';
import { useMediaQuery } from '../lib/useMeasure';
import { fmtMoney } from '../lib/format';
import { useToast } from '../components/ui/Toast';
import { ShareBar } from '../components/results/ShareBar';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { InvalidFieldsProvider, useInvalidFields } from '../components/forms/InvalidFields';
import { NotFoundPage } from './NotFoundPage';

export function CalculatorPage() {
  const { slug } = useParams();
  const def = slug ? getCalculatorBySlug(slug) : undefined;
  if (!def) return <NotFoundPage />;
  return (
    <InvalidFieldsProvider>
      <CalculatorShell key={def.id} def={def} />
    </InvalidFieldsProvider>
  );
}

/**
 * Adds a fade and a "scroll for more" pill to the sticky inputs pane so it is obvious the pane has
 * its own scroll and how much of the form is left. Without it the pane silently cuts off.
 */
function useScrollAffordance() {
  const scrollRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const update = () => {
      const more = el.scrollHeight - el.clientHeight - el.scrollTop > 24;
      wrap.setAttribute('data-more', more ? 'true' : 'false');
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    // The form's height changes as tabs and disclosures open, so watch its contents too.
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
      mo.disconnect();
    };
  }, []);
  return { scrollRef, wrapRef };
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function CalculatorShell({ def }: { def: AnyCalculator }) {
  // A scenario's name comes from its contents when the calculator can describe itself, so the tab
  // strip and the compare table stay readable instead of reading "Scenario 2, Scenario 3".
  const describe = useCallback((inputs: unknown) => (def.nameFor ? def.nameFor(def.normalize(inputs)) : `${def.shortName} scenario`), [def]);
  const { scenarios, active, setInputs, select, create, rename, duplicate, remove, reset, persisting, totalSaved, clearAll } = useScenarios(def.id, def.defaults, describe(def.defaults));
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [mobileView, setMobileView] = useState<'inputs' | 'results'>('inputs');
  const isMobile = useMediaQuery('(max-width: 960px)');
  const menuRef = useRef<HTMLDivElement>(null);
  const { scrollRef, wrapRef } = useScrollAffordance();
  const invalidFields = useInvalidFields()?.invalid ?? [];
  const resultsRef = useRef<HTMLDivElement>(null);
  const importedHash = useRef<string | null>(null);

  // Import a shared scenario from the URL hash (once per hash).
  useEffect(() => {
    const hash = location.hash;
    if (!hash.startsWith('#s=') || importedHash.current === hash) return;
    importedHash.current = hash;
    const shared = decodeShare(hash);
    if (!shared || shared.calculatorId !== def.id) {
      toast('That link is not a valid TrueCost scenario for this calculator');
      navigate(location.pathname, { replace: true });
      return;
    }
    const inputs = def.normalize(shared.inputs);
    const existing = scenarios.find((s) => deepEqual(def.normalize(s.inputs), inputs));
    if (existing) select(existing.id);
    else create(shared.name || 'Shared scenario', inputs);
    toast('Shared scenario loaded — every assumption is editable');
    navigate(location.pathname, { replace: true });
  }, [location.hash, location.pathname, def, scenarios, select, create, navigate, toast]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    document.title = `${def.name} — TrueCost Lab`;
    return () => {
      document.title = 'TrueCost Lab — What will this decision actually cost?';
    };
  }, [def.name]);

  const inputs = useMemo(() => (active ? def.normalize(active.inputs) : def.defaults), [active, def]);
  // Defer the (sensitivity-heavy) recompute so typing in a field never feels laggy.
  const deferredInputs = useDeferredValue(inputs);
  const result = useMemo(() => def.compute(deferredInputs), [def, deferredInputs]);
  const summary: ShareSummary = useMemo(() => def.summary(deferredInputs, result), [def, deferredInputs, result]);
  const activePreset = useMemo(() => def.presets.find((p: Preset<unknown>) => deepEqual(def.normalize(p.inputs), inputs)) ?? null, [def, inputs]);

  const onChange = useCallback((next: unknown) => setInputs(next), [setInputs]);
  /** True when the scenario still carries a name we generated, so renaming it won't lose the user's own label. */
  const isAutoNamed = (name: string) =>
    name === `${def.shortName} scenario` || name === describe(inputs) || def.presets.some((p: Preset<unknown>) => p.name === name) || scenarios.some((s) => name === describe(s.inputs));

  const loadPreset = (p: Preset<unknown>) => {
    setInputs(def.normalize(p.inputs), p.id);
    if (active && isAutoNamed(active.name)) rename(active.id, p.name);
    toast(`Loaded example: ${p.name}. Values are illustrative — edit anything.`);
  };

  const path = `/calculators/${def.slug}`;

  if (!active) {
    return (
      <div className="calc-page container" role="status" aria-live="polite">
        <div className="calc-head">
          <CalcIcon kind={def.icon} size={48} />
          <div>
            <h1>{def.name}</h1>
            <p>Loading your scenario…</p>
          </div>
        </div>
        <div className="calc-layout">
          <div className="card" style={{ height: 420, background: 'var(--tc-surface-2)' }} />
          <div className="card" style={{ height: 320, background: 'var(--tc-surface-2)' }} />
        </div>
      </div>
    );
  }

  const Form = def.Form;
  const Results = def.Results;

  return (
    <div className="calc-page has-answer-bar">
      <div className="container">
        <nav aria-label="Breadcrumb" className="small muted" style={{ marginBottom: 'var(--sp-3)' }}>
          <Link to="/">TrueCost Lab</Link> <span aria-hidden="true">›</span> <Link to="/#calculators">Calculators</Link> <span aria-hidden="true">›</span> {def.name}
        </nav>
        <div className="calc-head">
          <CalcIcon kind={def.icon} size={48} />
          <div>
            <h1>{def.name}</h1>
            <p>{def.description}</p>
          </div>
        </div>

        <div className="scenario-bar">
          <div className="scenario-tabs" role="tablist" aria-label="Saved scenarios">
            {scenarios.map((s) => (
              <button key={s.id} role="tab" type="button" aria-selected={s.id === active.id} className="scenario-tab" onClick={() => select(s.id)} title={s.name}>
                {s.name}
              </button>
            ))}
            <button type="button" className="scenario-tab" onClick={() => create(describe(def.defaults), def.defaults)} aria-label="New scenario" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IconPlus width={14} height={14} /> New
            </button>
          </div>
          <div className="scenario-actions">
            {scenarios.length > 1 && (
              <Button size="sm" variant="soft" icon={<IconCompare />} onClick={() => setCompareOpen(true)}>
                Compare scenarios
              </Button>
            )}
            <div className="menu" ref={menuRef}>
              <IconButton label="Scenario actions" icon={<IconMore />} onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen} />
              {menuOpen && (
                <div className="menu-pop" role="menu">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setRenameText(active.name);
                      setRenameOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <IconRename /> Rename scenario
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      duplicate(active.id);
                      setMenuOpen(false);
                      toast('Scenario duplicated');
                    }}
                  >
                    <IconDuplicate /> Duplicate
                  </button>
                  {def.swap && (
                    <button
                      role="menuitem"
                      onClick={() => {
                        setInputs(def.swap!(inputs));
                        setMenuOpen(false);
                        toast('Swapped Option A and Option B');
                      }}
                    >
                      <IconSwap /> Swap A and B
                    </button>
                  )}
                  <button
                    role="menuitem"
                    onClick={() => {
                      reset(active.id);
                      setMenuOpen(false);
                      toast('Inputs reset to defaults');
                    }}
                  >
                    <IconReset /> Reset inputs
                  </button>
                  <hr />
                  <button
                    role="menuitem"
                    className="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      if (scenarios.length <= 1) {
                        reset(active.id);
                        toast('Only one scenario — inputs reset instead');
                        return;
                      }
                      if (window.confirm(`Delete "${active.name}"? This cannot be undone.`)) {
                        remove(active.id);
                        toast('Scenario deleted');
                      }
                    }}
                  >
                    <IconTrash /> Delete scenario
                  </button>
                  <button
                    role="menuitem"
                    className="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      if (window.confirm(`Delete all ${totalSaved} saved scenario${totalSaved === 1 ? '' : 's'} across every TrueCost calculator, and clear this browser's stored data? This cannot be undone.`)) {
                        clearAll();
                        toast('All saved scenarios cleared from this browser');
                      }
                    }}
                  >
                    <IconTrash /> Clear all saved data ({totalSaved})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {!persisting && (
          <div className="callout callout-warning no-print" style={{ marginBottom: 'var(--sp-4)' }} role="alert">
            <IconWarning />
            <div>
              <strong>This browser is not saving your scenarios.</strong> Private browsing or blocked site data will do this. Everything still works, but your scenarios will be gone if you refresh — use <em>Copy link</em> to keep this one.
            </div>
          </div>
        )}
        <div className="mobile-switch no-print">
          <Segmented
            label="Show inputs or results"
            value={mobileView}
            onChange={(v) => {
              setMobileView(v);
              window.scrollTo({ top: Math.max(0, (document.querySelector('.mobile-switch') as HTMLElement | null)?.offsetTop ?? 0) - 70 });
            }}
            options={[
              { value: 'inputs', label: 'Inputs' },
              { value: 'results', label: 'Results' },
            ]}
            block
          />
        </div>
        <div className="calc-layout">
          <div className="calc-form-wrap" ref={wrapRef} hidden={isMobile && mobileView !== 'inputs'}>
            <aside className="calc-form card" aria-label="Inputs" ref={scrollRef}>
            <div className="card-pad">
              <div style={{ paddingTop: 'var(--sp-3)' }}>
                <div className="row-between" style={{ marginBottom: 8 }}>
                  <span className="eyebrow">Start from an example</span>
                  {activePreset && <span className="micro muted">Loaded: {activePreset.name}</span>}
                </div>
                <div className="chips-scroll" role="list" aria-label="Example scenarios">
                  {def.presets.map((p: Preset<unknown>) => (
                    <button key={p.id} type="button" role="listitem" className={`chip ${activePreset?.id === p.id ? 'active' : ''}`} onClick={() => loadPreset(p)} title={p.description}>
                      {p.chip ?? p.name}
                    </button>
                  ))}
                </div>
                {activePreset && (
                  <p className="micro muted" style={{ marginTop: 8 }}>
                    <IconWarning width={12} height={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                    Example values are illustrative estimates, not live quotes. Replace them with your own numbers.
                  </p>
                )}
              </div>
              <Form inputs={inputs} onChange={onChange} />
              </div>
            </aside>
            <span className="form-scroll-hint" aria-hidden="true">
              Scroll for more inputs
            </span>
          </div>
          <div className="calc-results" ref={resultsRef} id="results" hidden={isMobile && mobileView !== 'results'}>
            <div className="row-between no-print">
              <span className="small muted">
                Scenario: <strong>{active.name}</strong>
              </span>
              <ShareBar calculatorId={def.id} calculatorName={def.name} path={path} scenarioName={active.name} inputs={deferredInputs} summary={summary} />
            </div>
            <div className="print-only" style={{ marginBottom: 8 }}>
              <strong>TrueCost Lab — {def.name}</strong> · Scenario: {active.name} · {new Date().toLocaleDateString()}
            </div>
            {def.assumptions && (
              <div className="chips no-print" aria-label="Key assumptions" style={{ alignItems: 'center' }}>
                <span className="micro muted" style={{ fontWeight: 600 }}>
                  Assumes
                </span>
                {def.assumptions(deferredInputs)
                  .slice(0, 4)
                  .map((a: { label: string; value: string }) => (
                    <span key={a.label} className="chip" style={{ cursor: 'default' }} title={a.label}>
                      {a.value}
                    </span>
                  ))}
                <a href="#method" className="micro" style={{ fontWeight: 600 }}>
                  All assumptions
                </a>
              </div>
            )}
            {activePreset && (
              <div className="callout callout-neutral no-print" style={{ padding: '8px 12px' }}>
                <IconWarning />
                <div>
                  Showing the <strong>{activePreset.name}</strong> example with illustrative numbers. Edit any input to make it yours.
                </div>
              </div>
            )}
            {invalidFields.length > 0 && (
              <div className="callout callout-warning no-print" role="alert">
                <IconWarning />
                <div>
                  <strong>Check {invalidFields.length === 1 ? 'one input' : `${invalidFields.length} inputs`} before trusting this answer.</strong>{' '}
                  {invalidFields.join(', ')} {invalidFields.length === 1 ? 'is' : 'are'} outside the range this model accepts, so the results below still use the last valid value instead of what the form shows.
                </div>
              </div>
            )}
            <ErrorBoundary label="the results" onReset={() => reset(active.id)}>
              <Results inputs={deferredInputs} result={result} onChange={onChange} />
            </ErrorBoundary>
            <RelatedCalculators currentId={def.id} />
          </div>
        </div>
      </div>

      <div className="answer-bar no-print" role="region" aria-label="Result summary">
        <div className="txt">
          {invalidFields.length > 0 ? (
            // Never show a confident verdict while a field holds a value the model rejected.
            <>
              <strong className="text-negative">Check your inputs — {invalidFields.join(', ')} {invalidFields.length === 1 ? 'is' : 'are'} out of range.</strong>
              <span className="muted micro">The result below still uses the last valid value</span>
            </>
          ) : (
            <>
              <strong>{summary.headline}</strong>
              <span className="muted micro">{mobileView === 'inputs' ? 'Updates as you type · tap for the full breakdown' : 'Tap to change the assumptions'}</span>
            </>
          )}
        </div>
        {mobileView === 'inputs' ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setMobileView('results');
              requestAnimationFrame(() => {
                const top = (document.querySelector('.mobile-switch') as HTMLElement | null)?.offsetTop ?? 0;
                window.scrollTo({ top: Math.max(0, top - 70) });
              });
            }}
            iconRight={<IconArrowRight />}
          >
            Results
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              setMobileView('inputs');
              window.scrollTo({ top: 0 });
            }}
          >
            Edit inputs
          </Button>
        )}
      </div>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename scenario" icon={<IconRename />}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            rename(active.id, renameText);
            setRenameOpen(false);
          }}
          className="stack"
        >
          <TextField label="Scenario name" value={renameText} onChange={setRenameText} placeholder="e.g. Commuter car, 8 years" />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!renameText.trim()}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <CompareModal open={compareOpen} onClose={() => setCompareOpen(false)} def={def} scenarios={scenarios} activeId={active.id} onSelect={(id) => (select(id), setCompareOpen(false))} />
    </div>
  );
}

function CompareModal({ open, onClose, def, scenarios, activeId, onSelect }: { open: boolean; onClose: () => void; def: AnyCalculator; scenarios: { id: string; name: string; inputs: unknown }[]; activeId: string; onSelect: (id: string) => void }) {
  const rows = useMemo(() => {
    if (!open) return [];
    return scenarios.map((s) => {
      const inputs = def.normalize(s.inputs);
      const r = def.compute(inputs);
      return { id: s.id, name: s.name, summary: def.summary(inputs, r) as ShareSummary };
    });
  }, [open, scenarios, def]);
  if (!open) return null;
  const labels = rows[0]?.summary.rows.map((r) => r.label) ?? [];
  // The headline metric is always worth showing per scenario. The "biggest" badge only appears when
  // every column measures the same thing — comparing scenarios with different option names would
  // make that badge misleading.
  const hasMetric = rows.length > 0 && rows.every((r) => Number.isFinite(r.summary.keyMetric));
  const sameMetric = hasMetric && rows.length > 1 && rows.every((r) => r.summary.keyMetricLabel === rows[0].summary.keyMetricLabel);
  const best = sameMetric ? rows.reduce((acc, r) => (Math.abs(r.summary.keyMetric) > Math.abs(acc.summary.keyMetric) ? r : acc), rows[0]).id : null;
  return (
    <Modal open={open} onClose={onClose} title="Compare your scenarios" icon={<IconCompare />}>
      <div className="table-scroll">
        <table className="cmp-table scen-cmp">
          <thead>
            <tr>
              <th></th>
              {rows.map((r) => (
                <th key={r.id} className={r.id === activeId ? 'cur' : ''} style={{ textAlign: 'left' }}>
                  <button className="link-btn" onClick={() => onSelect(r.id)} title="Open this scenario">
                    {r.name}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Answer</td>
              {rows.map((r) => (
                <td key={r.id} style={{ textAlign: 'left', fontWeight: 500, minWidth: 180 }}>
                  {r.summary.headline}
                </td>
              ))}
            </tr>
            {hasMetric && (
              <tr>
                <td>{sameMetric ? rows[0].summary.keyMetricLabel : 'Headline difference'}</td>
                {rows.map((r) => (
                  <td key={r.id} style={{ textAlign: 'left' }}>
                    <strong>{fmtMoney(r.summary.keyMetric)}</strong>
                    {!sameMetric && <div className="micro muted">{r.summary.keyMetricLabel}</div>}
                    {r.id === best && (
                      <span className="flip-badge" style={{ marginLeft: 8, background: 'var(--tc-positive-soft)', color: 'var(--tc-positive)' }}>
                        <IconCheck /> biggest
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            )}
            {labels.map((label, i) => (
              <tr key={label}>
                <td>{label}</td>
                {rows.map((r) => (
                  <td key={r.id} style={{ textAlign: 'left' }}>
                    {r.summary.rows[i]?.value ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="micro muted">Click a scenario name to open it. Row labels come from the first scenario; if scenarios use different option names, compare the totals rather than the labels.</p>
    </Modal>
  );
}

function RelatedCalculators({ currentId }: { currentId: string }) {
  const others = CALCULATORS.filter((c) => c.id !== currentId).slice(0, 4);
  return (
    <section className="no-print" aria-label="Other calculators" style={{ marginTop: 'var(--sp-2)' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Keep exploring
      </div>
      <div className="calc-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {others.map((c) => (
          <Link key={c.id} to={`/calculators/${c.slug}`} className="calc-card" style={{ padding: 'var(--sp-4)' }}>
            <CalcIcon kind={c.icon} size={32} />
            <h3 style={{ fontSize: 'var(--fs-body)' }}>{c.name}</h3>
            <p className="micro">{c.tagline}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
