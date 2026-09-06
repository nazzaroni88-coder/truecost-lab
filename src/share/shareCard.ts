/**
 * Branded result card renderer (canvas → PNG), drawn at 2x for crispness.
 *
 * Four formats, because the shape decides whether anyone posts it: a 4:5 or 9:16 card is what fits
 * Instagram and stories, and 1200x630 is for link unfurls. The content is the same distilled
 * conclusion in each — winner, gap, period, what drives it — never the full report.
 *
 * No external assets: the logo mark is drawn with paths, text uses the system/Inter font stack.
 */
import type { ShareSummary } from '../calculators/types';

export interface ShareCardData {
  calculatorName: string;
  scenarioName?: string;
  summary: ShareSummary;
}

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
// Mirrors the light tokens in tokens.css. Canvas cannot read CSS variables, so these are copied by
// hand and must be updated alongside them — b was left on the old #b85a08 when the token moved to
// #ad5407 for AA contrast, and the card quietly drifted away from the app.
const COLORS = { ink: '#1a1f2b', ink2: '#454d5c', ink3: '#616978', line: '#e0e3e8', primary: '#1b6ef3', primaryStrong: '#1256c7', a: '#1256c7', b: '#ad5407', soft: '#f1f4f9', lineStrong: '#c8cdd6', positive: '#167a4a', negative: '#cf3a2e' };

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Trims to fit `maxWidth` at the context's current font, adding a single ellipsis. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
  return `${s.replace(/[\s·…]+$/, '')}…`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 32;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, 0, 32, 32);
  g.addColorStop(0, '#2b7cf6');
  g.addColorStop(1, '#1256c7');
  roundRect(ctx, 1, 1, 30, 30, 9);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.beginPath();
  ctx.moveTo(9.5, 8.5);
  ctx.lineTo(16.7, 8.5);
  ctx.quadraticCurveTo(18, 8.5, 18.8, 9.4);
  ctx.lineTo(24.6, 15.2);
  ctx.quadraticCurveTo(26, 16.6, 24.6, 18);
  ctx.lineTo(18, 24.6);
  ctx.quadraticCurveTo(16.6, 26, 15.2, 24.6);
  ctx.lineTo(9.4, 18.8);
  ctx.quadraticCurveTo(7.5, 17.6, 7.5, 15.5);
  ctx.lineTo(7.5, 10.5);
  ctx.quadraticCurveTo(7.5, 8.5, 9.5, 8.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1256c7';
  ctx.beginPath();
  ctx.arc(13, 12.2, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1256c7';
  ctx.lineWidth = 1.9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(14.6, 19.4);
  ctx.lineTo(16.6, 21.4);
  ctx.lineTo(20.2, 17.6);
  ctx.stroke();
  ctx.restore();
}

export type ShareFormat = 'landscape' | 'square' | 'portrait' | 'story';

/**
 * The shapes people actually post in.
 *
 * The card used to render only 1200×630 — an Open Graph / link-unfurl size. That is the wrong shape
 * for the places this brand's readers are: a landscape image in an Instagram feed is a letterbox
 * with grey bars, and in a story it is a stamp. Same content, laid out for the frame it lands in.
 */
export const SHARE_FORMATS: { id: ShareFormat; label: string; hint: string; w: number; h: number }[] = [
  { id: 'portrait', label: 'Post', hint: 'Instagram, 4:5', w: 1080, h: 1350 },
  { id: 'square', label: 'Square', hint: 'Feeds, 1:1', w: 1080, h: 1080 },
  { id: 'story', label: 'Story', hint: 'Stories, Reels, 9:16', w: 1080, h: 1920 },
  { id: 'landscape', label: 'Link', hint: 'X, Threads, previews', w: 1200, h: 630 },
];

function formatSpec(id: ShareFormat) {
  return SHARE_FORMATS.find((f) => f.id === id) ?? SHARE_FORMATS[0];
}

/** Result cards carry the estimate disclosure; brand cards have no estimate to disclaim. */
const FOOT_RESULT_NOTE = 'Illustrative estimate · not financial advice';
const FOOT_BRAND_NOTE = 'Free · nothing you enter leaves your browser';
const FOOT_RIGHT = 'TrueCost Lab · a Cents of Adventure tool';

/**
 * Fits the two footer lines to the card width.
 *
 * They run toward each other from opposite edges, so the size is measured rather than assumed — at
 * the portrait scale a fixed 14*k overlapped them into "not financTrueCost Lab". Shrink until they
 * clear, then stack them if even the floor is too tight. Shared with the layout pass so the content
 * block knows how much room the footer actually took.
 */
function footerMetrics(ctx: CanvasRenderingContext2D, w: number, h: number, pad: number, k: number, note: string) {
  const inner = w - pad * 2;
  const width = (size: number) => {
    ctx.font = `500 ${size}px ${FONT}`;
    const lw = ctx.measureText(note).width;
    ctx.font = `600 ${size}px ${FONT}`;
    return lw + ctx.measureText(FOOT_RIGHT).width;
  };
  const gap = Math.round(24 * k);
  const floor = Math.round(11 * Math.min(k, 1.2));
  let fs = Math.round(14 * k);
  while (fs > floor && width(fs) + gap > inner) fs -= 1;
  const stacked = width(fs) + gap > inner;
  const lift = stacked ? fs + 6 : 0;
  const footY = h - Math.round(pad * 0.9);
  return { fs, stacked, lift, inner, footY, footTop: footY - Math.round(46 * k) - lift };
}

/** Draws the winner accent, header and footer that every format shares. */
function drawChrome(ctx: CanvasRenderingContext2D, w: number, h: number, data: ShareCardData, pad: number, k: number, note: string) {
  const accent = data.summary.winner === 'a' ? '#1b6ef3' : data.summary.winner === 'b' ? '#f0811f' : '#1b6ef3';
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, Math.round(6 * k));

  const markSize = Math.round(40 * k);
  drawMark(ctx, pad, Math.round(pad * 0.78), markSize);
  ctx.textBaseline = 'alphabetic';
  const wordY = Math.round(pad * 0.78) + markSize * 0.72;
  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 ${Math.round(25 * k)}px ${FONT}`;
  ctx.fillText('TrueCost', pad + markSize + Math.round(14 * k), wordY);
  const tw = ctx.measureText('TrueCost').width;
  ctx.fillStyle = COLORS.primary;
  ctx.font = `700 ${Math.round(25 * k)}px ${FONT}`;
  ctx.fillText('Lab', pad + markSize + Math.round(14 * k) + tw + Math.round(8 * k), wordY);

  // Footer: the disclosure and the attribution, on one rule.
  const { fs, stacked, lift, inner, footY, footTop } = footerMetrics(ctx, w, h, pad, k, note);
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(pad, footY - Math.round(30 * k) - lift, inner, 1);
  ctx.fillStyle = COLORS.ink3;
  ctx.font = `500 ${fs}px ${FONT}`;
  ctx.fillText(note, pad, stacked ? footY - lift : footY);
  ctx.fillStyle = COLORS.primaryStrong;
  ctx.font = `600 ${fs}px ${FONT}`;
  if (stacked) {
    ctx.fillText(FOOT_RIGHT, pad, footY);
  } else {
    ctx.textAlign = 'right';
    ctx.fillText(FOOT_RIGHT, w - pad, footY);
    ctx.textAlign = 'left';
  }
  return { footTop };
}

/**
 * The rows a calculator already curates, for the comparisons that have no category decomposition.
 *
 * Rent vs buy and the invest-instead calculators weigh two strategies for the same money, so there
 * are no paired categories to difference — inventing drivers there would be fiction. Their summary
 * rows are the same figures the page shows, and they carry the fact worth posting (a break-even
 * year, a portfolio against an equity stake) instead of leaving two thirds of the card blank.
 */
function drawRows(ctx: CanvasRenderingContext2D, rows: ShareSummary['rows'], x: number, y: number, w: number, k: number): number {
  let ry = y;
  ctx.fillStyle = COLORS.ink3;
  ctx.font = `700 ${Math.round(13 * k)}px ${FONT}`;
  ctx.fillText('THE NUMBERS', x, ry);
  ry += Math.round(26 * k);
  for (const r of rows) {
    // An untoned row still gets a mark, but a quiet one — at --tc-line it was so faint it read as
    // a rendering artefact rather than a deliberate rule.
    const tick = r.tone === 'a' ? COLORS.a : r.tone === 'b' ? COLORS.b : r.tone === 'positive' ? COLORS.positive : COLORS.lineStrong;
    ctx.fillStyle = tick;
    ctx.fillRect(x, ry - Math.round(13 * k), Math.round(3 * k), Math.round(17 * k));
    const labelX = x + Math.round(12 * k);
    ctx.font = `500 ${Math.round(16 * k)}px ${FONT}`;
    const valueW = ctx.measureText(r.value).width;
    ctx.fillStyle = COLORS.ink;
    ctx.font = `600 ${Math.round(19 * k)}px ${FONT}`;
    ctx.fillText(ellipsize(ctx, r.label, w - Math.round(12 * k) - valueW - Math.round(16 * k)), labelX, ry);
    ctx.font = `500 ${Math.round(16 * k)}px ${FONT}`;
    ctx.fillStyle = COLORS.ink2;
    ctx.textAlign = 'right';
    ctx.fillText(r.value, x + w, ry);
    ctx.textAlign = 'left';
    ry += Math.round(34 * k);
  }
  return ry;
}

/** Driver lines: what actually creates the gap, and who pays it. */
function drawDrivers(ctx: CanvasRenderingContext2D, drivers: NonNullable<ShareSummary['drivers']>, x: number, y: number, w: number, k: number): number {
  let ry = y;
  ctx.fillStyle = COLORS.ink3;
  ctx.font = `700 ${Math.round(13 * k)}px ${FONT}`;
  ctx.fillText('WHAT DRIVES IT', x, ry);
  ry += Math.round(26 * k);
  for (const d of drivers) {
    // The tick takes the colour of whichever option this category is worse for.
    ctx.fillStyle = d.costlierFor === 'a' ? COLORS.a : COLORS.b;
    ctx.fillRect(x, ry - Math.round(13 * k), Math.round(3 * k), Math.round(17 * k));
    const labelX = x + Math.round(12 * k);
    ctx.fillStyle = COLORS.ink;
    ctx.font = `600 ${Math.round(19 * k)}px ${FONT}`;
    ctx.fillText(d.label, labelX, ry);
    // The label and the amount grow toward each other; measure rather than guess at a character
    // count, and drop the option name before letting the two collide.
    const room = x + w - (labelX + ctx.measureText(d.label).width) - Math.round(16 * k);
    ctx.font = `500 ${Math.round(16 * k)}px ${FONT}`;
    const full = `${fmtCurrency(d.amount)} more · ${d.costlierName}`;
    const right = ctx.measureText(full).width <= room ? full : `${fmtCurrency(d.amount)} more`;
    ctx.fillStyle = COLORS.ink2;
    ctx.textAlign = 'right';
    ctx.fillText(right, x + w, ry);
    ctx.textAlign = 'left';
    ry += Math.round(34 * k);
  }
  return ry;
}

function fmtCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/**
 * The slice of the canvas API these cards use.
 *
 * The same renderer draws the in-app preview and the Open Graph images the build pre-renders in
 * Node, so it is typed against what it actually touches rather than against the DOM.
 */
export interface CardCanvas {
  width: number;
  height: number;
  getContext(type: '2d'): CanvasRenderingContext2D | null;
}

export function renderShareCard(canvas: CardCanvas, data: ShareCardData, format: ShareFormat = 'portrait', scale = 2): void {
  const spec = formatSpec(format);
  const w = spec.w;
  const h = spec.h;
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  /*
   * Type scale per format.
   *
   * A 1080-wide portrait card at landscape's scale is landscape type floating in a taller frame —
   * the first draft filled the top third and left the rest blank. The tall formats get materially
   * bigger type, and the block is then centred in the space between header and footer rather than
   * hanging off the top.
   */
  const pad = Math.round(w * (format === 'landscape' ? 0.047 : 0.074));
  const colW = format === 'landscape' ? Math.round(w * 0.545) : w - pad * 2;
  const headSize = format === 'landscape' ? 44 : 40;
  const subSize = format === 'landscape' ? 19 : 17;
  const ctxSize = format === 'landscape' ? 15 : 14;
  const maxDrivers = format === 'landscape' ? 0 : format === 'story' ? 4 : 3;
  /** The scale the card would like to use; the fit loop steps down from here if it must. */
  const kIdeal = format === 'landscape' ? 1 : format === 'story' ? 2.3 : format === 'square' ? 1.7 : 1.95;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Drivers when the calculator has them, otherwise the rows it already curates. Either way the
  // middle of the card carries a few concrete figures rather than white space.
  const drivers = data.summary.drivers ?? [];
  // Rows whose figures the supporting sentence has already spent are repetition, not evidence —
  // rent vs buy was printing "home equity $238,158 vs portfolio $338,239" and then both again.
  /*
   * A row earns its place only if both halves can be read.
   *
   * Debt vs Invest offers "Debt-free in: 4 years, 4 months vs not within horizon" — a value long
   * enough that fitting it crushed the label to "Debt-fr…", which is worse than not showing the row
   * at all. Calculators publish more rows than a card has slots, so an unreadable one is dropped
   * rather than squeezed. The test is against the widest type the card can use; the fit loop only
   * ever shrinks from there, which leaves more room, never less.
   */
  const detailW = format === 'landscape' ? w - Math.round(w * 0.605) - pad : colW;
  const valueFits = (value: string) => {
    ctx.font = `500 ${Math.round(16 * kIdeal)}px ${FONT}`;
    return ctx.measureText(value).width <= detailW * 0.42;
  };
  const rows = drivers.length ? [] : data.summary.rows.filter((r) => r.value && r.value !== '—' && !data.summary.sub.includes(r.value) && valueFits(r.value));
  const detail: unknown[] = drivers.length ? drivers : rows;

  /** Everything that depends on the type scale, measured but not drawn. */
  const measure = (k: number) => {
    const headLead = Math.round(headSize * k * 1.2);
    const subLead = Math.round(subSize * k * 1.45);
    ctx.font = `600 ${Math.round(headSize * k)}px ${FONT}`;
    const headLines = wrap(ctx, data.summary.headline, colW).slice(0, 4);
    ctx.font = `400 ${Math.round(subSize * k)}px ${FONT}`;
    const subLines = wrap(ctx, data.summary.sub, colW).slice(0, 3);
    const driverCount = Math.min(detail.length, maxDrivers);
    const driverBlock = driverCount ? Math.round(26 * k) + driverCount * Math.round(34 * k) : 0;
    // Measured, not reserved-and-maybe-skipped: the first draft booked a flat 70*k for the invest
    // line and then a draw-time guard often dropped it, leaving that space empty above the footer.
    ctx.font = `600 ${Math.round(19 * k)}px ${FONT}`;
    const investLines = data.summary.investLine ? wrap(ctx, data.summary.investLine, colW).slice(0, 2) : [];
    const investBlock = investLines.length ? Math.round(30 * k) + investLines.length * Math.round(26 * k) : 0;
    const blockH = Math.round(30 * k) + headLines.length * headLead + Math.round(10 * k) + subLines.length * subLead + (driverBlock ? Math.round(24 * k) + driverBlock : 0) + investBlock;
    // Landscape puts the detail in a second column instead, so the taller of the two decides
    // whether this scale fits — measuring only the text column would let the detail run into the
    // footer on a calculator with four long drivers.
    const sideH = maxDrivers ? 0 : Math.round(30 * k) + Math.round(26 * k) + Math.min(detail.length, 4) * Math.round(34 * k);
    // The header and footer are drawn at the same scale, so they move with it.
    const headerBottom = Math.round(pad * 0.78) + Math.round(80 * k);
    const { footTop } = footerMetrics(ctx, w, h, pad, k, FOOT_RESULT_NOTE);
    return { k, headLead, subLead, headLines, subLines, investLines, blockH, headerBottom, footTop, fits: Math.max(blockH, sideH) <= footTop - headerBottom };
  };

  /*
   * Type scale per format, fitted rather than fixed.
   *
   * A 1080-wide portrait card at landscape's scale is landscape type floating in a taller frame —
   * the first draft filled the top third and left the rest blank. The tall formats start much
   * larger; the loop then steps the scale down only as far as a long headline actually requires,
   * so nothing can run into the footer and short answers still fill the frame.
   */
  let m = measure(kIdeal);
  for (let k = kIdeal; !m.fits && k > 0.7; k -= 0.05) m = measure(k);
  const { k, headLead, subLead, headLines, subLines, investLines, blockH, headerBottom, footTop } = m;

  drawChrome(ctx, w, h, data, pad, k, FOOT_RESULT_NOTE);

  const available = footTop - headerBottom;
  const contentTop = headerBottom + Math.max(Math.round(16 * k), Math.round((available - blockH) / 2));

  // Context line: which calculator, which scenario.
  ctx.fillStyle = COLORS.ink3;
  ctx.font = `500 ${Math.round(ctxSize * k)}px ${FONT}`;
  // Truncate by width, not character count — a fixed 58 chars clipped mid-word well inside the
  // column and produced a stray second ellipsis on names that already ended in one.
  ctx.fillText(ellipsize(ctx, data.scenarioName ? `${data.calculatorName} · ${data.scenarioName}` : data.calculatorName, colW), pad, contentTop);

  // The answer.
  let y = contentTop + Math.round(30 * k);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 ${Math.round(headSize * k)}px ${FONT}`;
  for (const l of headLines) {
    y += headLead;
    ctx.fillText(l, pad, y - Math.round(headLead * 0.24));
  }

  // One supporting sentence, never the whole report.
  y += Math.round(10 * k);
  ctx.fillStyle = COLORS.ink2;
  ctx.font = `400 ${Math.round(subSize * k)}px ${FONT}`;
  for (const l of subLines) {
    y += subLead;
    ctx.fillText(l, pad, y - Math.round(subLead * 0.28));
  }

  /** Invest-the-difference is the line people screenshot; the fit pass already booked its space. */
  const drawInvest = (top: number, width: number) => {
    if (!investLines.length) return;
    let iy = top + Math.round(10 * k);
    ctx.fillStyle = COLORS.line;
    ctx.fillRect(pad, iy - Math.round(20 * k), width, 1);
    ctx.fillStyle = COLORS.positive;
    ctx.font = `600 ${Math.round(19 * k)}px ${FONT}`;
    for (const l of investLines) {
      ctx.fillText(l, pad, iy);
      iy += Math.round(26 * k);
    }
  };

  /** Whichever detail block this calculator has, drawn into the given column. */
  const drawDetail = (n: number, x: number, top: number, width: number) => (drivers.length ? drawDrivers(ctx, drivers.slice(0, n), x, top, width, k) : rows.length ? drawRows(ctx, rows.slice(0, n), x, top, width, k) : top);

  if (format === 'landscape') {
    // Two columns: the answer on the left, the detail stacked on the right.
    const rx = Math.round(w * 0.605);
    drawDetail(4, rx, contentTop + Math.round(30 * k), w - rx - pad);
    // The left column used to stop at the sub and leave the bottom third blank.
    drawInvest(y + Math.round(30 * k), colW);
  } else {
    y += Math.round(24 * k);
    y = drawDetail(format === 'story' ? 4 : 3, pad, y, colW);
    drawInvest(y, colW);
  }
}

/**
 * The card for pages that have no result to show — the homepage, methodology, about.
 *
 * Same chrome, same type, so a link to the homepage and a link to a result read as one family in a
 * feed. It states what the tool does and lists what it covers, rather than dressing a brand line up
 * as an answer: a card that looks like a result but holds no numbers is the worse lie.
 */
export function renderBrandCard(canvas: CardCanvas, data: { title: string; sub: string; items: string[] }, format: ShareFormat = 'landscape', scale = 2): void {
  const spec = formatSpec(format);
  const { w, h } = spec;
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  // A brand card holds a headline and a list, so it can carry larger type than a result card at
  // the same size without the frame filling up.
  const k = format === 'landscape' ? 1.18 : format === 'story' ? 2.1 : 1.7;
  const pad = Math.round(w * (format === 'landscape' ? 0.047 : 0.074));
  const colW = format === 'landscape' ? Math.round(w * 0.51) : w - pad * 2;
  const headSize = 46;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  // No winner to colour the accent, so the brand card always wears the primary.
  const { footTop } = drawChrome(ctx, w, h, { calculatorName: '', summary: { headline: '', sub: '', rows: [], winner: 'none', keyMetric: 0, keyMetricLabel: '' } }, pad, k, FOOT_BRAND_NOTE);

  const headerBottom = Math.round(pad * 0.78) + Math.round(80 * k);
  const headLead = Math.round(headSize * k * 1.16);
  ctx.font = `600 ${Math.round(headSize * k)}px ${FONT}`;
  const headLines = wrap(ctx, data.title, colW).slice(0, 3);
  ctx.font = `400 ${Math.round(19 * k)}px ${FONT}`;
  const subLines = wrap(ctx, data.sub, colW).slice(0, 4);
  const subLead = Math.round(19 * k * 1.5);
  const blockH = headLines.length * headLead + Math.round(14 * k) + subLines.length * subLead;
  const listH = Math.round(26 * k) + data.items.length * Math.round(31 * k);
  const contentTop = headerBottom + Math.max(Math.round(10 * k), Math.round((footTop - headerBottom - Math.max(blockH, listH)) / 2));
  let y = contentTop;

  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 ${Math.round(headSize * k)}px ${FONT}`;
  for (const l of headLines) {
    y += headLead;
    ctx.fillText(l, pad, y - Math.round(headLead * 0.24));
  }
  y += Math.round(14 * k);
  ctx.fillStyle = COLORS.ink2;
  ctx.font = `400 ${Math.round(19 * k)}px ${FONT}`;
  for (const l of subLines) {
    y += subLead;
    ctx.fillText(l, pad, y - Math.round(subLead * 0.28));
  }

  // The list sits beside the headline on a wide card and under it on a tall one.
  const listX = format === 'landscape' ? Math.round(w * 0.605) : pad;
  const listW = format === 'landscape' ? w - listX - pad : colW;
  let ly = format === 'landscape' ? contentTop + Math.round(16 * k) : y + Math.round(40 * k);
  ctx.fillStyle = COLORS.ink3;
  ctx.font = `700 ${Math.round(13 * k)}px ${FONT}`;
  ctx.fillText('WHAT IT COVERS', listX, ly);
  ly += Math.round(26 * k);
  for (const item of data.items) {
    if (ly > footTop) break;
    ctx.fillStyle = COLORS.primary;
    ctx.fillRect(listX, ly - Math.round(12 * k), Math.round(3 * k), Math.round(16 * k));
    ctx.fillStyle = COLORS.ink;
    ctx.font = `600 ${Math.round(18 * k)}px ${FONT}`;
    ctx.fillText(ellipsize(ctx, item, listW - Math.round(12 * k)), listX + Math.round(12 * k), ly);
    ly += Math.round(31 * k);
  }
}

export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
