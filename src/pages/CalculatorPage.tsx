import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getCalculatorBySlug, type AnyCalculator } from '../calculators/registry';
import type { Preset, ShareSummary } from '../calculators/types';
import { CALCULATORS } from '../calculators/meta';
import { useScenarios } from '../scenarios/store';
import { decodeShare } from '../scenarios/urlCodec';
import { nextScenarioName } from '../scenarios/naming';
import { Button, IconButton } from '../components/ui/Button';
import { CalcIcon, IconCheck, IconCompare, IconDuplicate, IconMore, IconPlus, IconRename, IconReset, IconSwap, IconTrash, IconArrowRight, IconWarning } from '../components/ui/Icons';
import { Modal } from '../components/ui/Modal';
import { Segmented, TextField } from '../components/ui/Controls';
import { useMediaQuery } from '../lib/useMeasure';
import { onFieldFocusRequest, requestFieldFocus } from '../lib/focusField';
import { fmtMoney } from '../lib/format';
import { useToast } from '../components/ui/Toast';
import { ShareBar, ShareModal } from '../components/results/ShareBar';
import { ShareProvider } from '../components/results/ShareContext';
import { ProvenanceProvider, countEdited } from '../components/results/ProvenanceContext';
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
  // Results first on mobile: a preset is always loaded, so there is an answer to show on arrival.
  // Opening on the form made a decision tool read as a data-entry chore.
  const [mobileView, setMobileView] = useState<'inputs' | 'results'>('results');
  const isMobile = useMediaQuery('(max-width: 960px)');
  const menuRef = useRef<HTMLDivElement>(null);
  const { scrollRef, wrapRef } = useScrollAffordance();
  const invalidFields = useInvalidFields()?.invalid ?? [];
  const resultsRef = useRef<HTMLDivElement>(null);
  const importedHash = useRef<string | null>(null);
  const loadedPreset = useRef<string | null>(null);

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

  /*
   * Any focus request reveals the form on mobile, wherever it came from.
   *
   * The assumption chips used to switch the view themselves, which meant every future caller had to
   * remember to. The results pane does not know it is a separate view on a phone, and should not
   * have to — the shell that owns that state handles it once.
   */
  useEffect(() => onFieldFocusRequest(() => { if (isMobile) setMobileView('inputs'); }), [isMobile]);

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
  // A preset is "still loaded" if the inputs match it as it would look in the situation the user has
  // described. Without contextualizePreset, picking a state would instantly un-match every preset
  // and the chip would go dark even though nothing personal had been entered yet.
  const contextualize = useCallback(
    (presetInputs: unknown) => (def.contextualizePreset ? def.contextualizePreset(def.normalize(presetInputs), inputs) : def.normalize(presetInputs)),
    [def, inputs],
  );
  const activePreset = useMemo(() => def.presets.find((p: Preset<unknown>) => deepEqual(contextualize(p.inputs), inputs)) ?? null, [def, inputs, contextualize]);
  // Computed whether or not a preset still matches: once the user has personalised things, this is
  // what replaces the "illustrative example" banner rather than leaving the results unlabelled.
  const presetNote = def.presetNote ? def.presetNote(inputs) : null;

  /**
   * Applies an edit, and keeps a generated name in step with the numbers it describes.
   *
   * Names used to be generated once and never revisited, so a scenario created at five years and
   * then edited to nine still read "… · 5 yr" in the tab strip and in any link shared from it — a
   * label stating something the scenario no longer said. The test is deliberately narrow: we only
   * touch a name that is exactly what `describe` would have produced for the inputs being replaced,
   * which is the one case where the name is provably ours. A name the user typed, or a preset's own
   * name, does not match and is left alone.
   */
  const onChange = useCallback(
    (next: unknown) => {
      if (active) {
        const nextName = nextScenarioName(active.name, describe, inputs, next);
        if (nextName) rename(active.id, nextName);
      }
      setInputs(next);
    },
    [active, describe, inputs, rename, setInputs],
  );
  /**
   * Resets to defaults through the same naming rule as an edit.
   *
   * `reset` writes inputs straight to the store, so on its own it left a generated name describing
   * the numbers that were just discarded — a scenario reset back to five years still reading
   * "· 9 yr". Every path that replaces inputs has to go through the rule, not just typing.
   */
  const resetInputs = useCallback(() => {
    if (!active) return;
    const generated = nextScenarioName(active.name, describe, inputs, def.defaults);
    /*
     * A preset's name is normally left alone, because it records which example the scenario started
     * from — but a reset discards exactly that. Without this, loading "10% down with PMI" and then
     * resetting leaves a scenario named after an example whose numbers are gone, which is the same
     * label-describing-absent-contents problem the naming rule exists to prevent.
     */
    const fromPreset = def.presets.some((p: Preset<unknown>) => p.name === active.name);
    const nextName = generated ?? (fromPreset ? describe(def.defaults) : null);
    if (nextName && nextName !== active.name) rename(active.id, nextName);
    reset(active.id);
  }, [active, describe, inputs, def.defaults, def.presets, rename, reset]);

  /** True when the scenario still carries a name we generated, so renaming it won't lose the user's own label. */
  const isAutoNamed = (name: string) =>
    name === `${def.shortName} scenario` || name === describe(inputs) || def.presets.some((p: Preset<unknown>) => p.name === name) || scenarios.some((s) => name === describe(s.inputs));

  const loadPreset = (p: Preset<unknown>) => {
    // Loading an example must not throw away what the user already told us about their situation,
    // so the preset is adapted to it first rather than replacing it wholesale.
    setInputs(contextualize(p.inputs), p.id);
    if (active && isAutoNamed(active.name)) rename(active.id, p.name);
    toast(`Loaded example: ${p.name}. Values are illustrative — edit anything.`);
  };

  /*
   * Open a named example from ?preset=<id>, the handoff the /compare pages use.
   *
   * It goes through the same loadPreset the chips use rather than a link carrying raw inputs, so
   * the example is still adapted to anything the reader has already told us about their situation,
   * and it is recognised as the active preset instead of arriving as an anonymous scenario. The
   * param is stripped afterwards: it records an action already taken, and leaving it in the URL
   * would re-run it on every back-navigation.
   */
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('preset');
    if (!id || loadedPreset.current === id) return;
    loadedPreset.current = id;
    const preset = def.presets.find((p: Preset<unknown>) => p.id === id);
    if (preset) loadPreset(preset);
    navigate(location.pathname, { replace: true });
    // loadPreset closes over inputs that change on every keystroke; re-running on that would
    // reload the example while the reader is editing it. The ref guard makes it once-per-id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, location.pathname, def, navigate]);

  /*
   * How much of this answer is the reader's own work.
   *
   * Measured against the example the scenario was loaded from, falling back to the calculator's
   * defaults. This feeds the line beside the answer; the count matters because "1 figure is yours"
   * and "14 figures are yours" deserve very different amounts of trust.
   *
   * Above the "loading" early return, not below it: a hook after a conditional return runs on some
   * renders and not others, and React counts hooks by position. The loading pass ran 49 and the
   * loaded pass 50, which took the whole calculator page down with "Rendered more hooks than during
   * the previous render" — a blank screen on any visit that hit the loading state.
   */
  const provenance = useMemo(() => {
    const baseline = activePreset ? def.normalize(activePreset.inputs) : def.defaults;
    return { edited: countEdited(deferredInputs, baseline), presetName: activePreset?.name };
  }, [activePreset, def, deferredInputs]);

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
                        // Through onChange, not setInputs: swapping reverses the two names, so a
                        // generated label has to follow it the same way an edit does.
                        onChange(def.swap!(inputs));
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
                      resetInputs();
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
                        resetInputs();
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
            <aside className="calc-form" aria-label="Inputs" ref={scrollRef}>
            <div className="form-pad">
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
          </div>
          <ShareProvider
            calculatorId={def.id}
            calculatorName={def.name}
            path={path}
            scenarioName={active.name}
            inputs={deferredInputs}
            summary={summary}
            blocked={invalidFields.length > 0}
            renderModal={(p) => <ShareModal {...p} />}
          >
          <div className="calc-results" ref={resultsRef} id="results" hidden={isMobile && mobileView !== 'results'}>
            <div className="row-between no-print">
              <span className="small muted">
                Scenario: <strong>{active.name}</strong>
              </span>
              <ShareBar />
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
                  .map((a: { label: string; value: string; fieldId?: string }) =>
                    a.fieldId ? (
                      // Clicking the assumption takes you to the input behind it. On mobile the form
                      // is a separate view, so switch to it first or the focus lands off-screen.
                      <button
                        key={a.label}
                        type="button"
                        className="chip chip-jump"
                        title={`${a.label} — click to edit`}
                        onClick={() => {
                          requestFieldFocus(a.fieldId!);
                        }}
                      >
                        {a.value}
                      </button>
                    ) : (
                      <span key={a.label} className="chip" style={{ cursor: 'default' }} title={a.label}>
                        {a.value}
                      </span>
                    ),
                  )}
                <a href="#method" className="micro" style={{ fontWeight: 600 }}>
                  All assumptions
                </a>
              </div>
            )}
            {/* Only the calculator's own note survives here. "Showing the X example with illustrative
                numbers" now sits beside the answer itself, where it qualifies the figure rather than
                floating above the result as a third copy of the same disclosure. */}
            {presetNote && (
              <div className="callout callout-neutral no-print" style={{ padding: '8px 12px' }}>
                <IconWarning />
                <div>{presetNote}</div>
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
            <ErrorBoundary label="the results" onReset={resetInputs}>
              <ProvenanceProvider value={provenance}>
                <Results inputs={deferredInputs} result={result} onChange={onChange} />
              </ProvenanceProvider>
            </ErrorBoundary>
            <RelatedCalculators currentId={def.id} />
          </div>
          </ShareProvider>
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
                {rows.map((r) => {
                  const cell = r.summary.rows[i];
                  // Rows are matched by position, and the row heading is the FIRST scenario's label.
                  // Where a scenario names that row differently — a different car, a different
                  // horizon — the heading would be describing someone else's number, so the cell
                  // states what it actually is. Same treatment the key metric above already gets.
                  const differs = cell && cell.label !== label;
                  return (
                    <td key={r.id} style={{ textAlign: 'left' }}>
                      {cell?.value ?? '—'}
                      {differs && <div className="micro muted">{cell.label}</div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="micro muted">
        Click a scenario name to open it. Rows line up by position, and the heading is the first scenario's wording — where another scenario calls that row something
        else, its own label is shown under the figure.
      </p>
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
