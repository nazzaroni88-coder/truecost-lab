/**
 * Branded result card renderer (canvas → PNG). 1200×630 (social image ratio), drawn at 2× for crispness.
 * No external assets: the logo mark is drawn with paths, text uses the system/Inter font stack.
 */
import type { ShareSummary } from '../calculators/types';

export interface ShareCardData {
  calculatorName: string;
  scenarioName?: string;
  summary: ShareSummary;
}

const W = 1200;
const H = 630;
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
// Mirrors the light tokens in tokens.css. Canvas cannot read CSS variables, so these are copied by
// hand and must be updated alongside them — b was left on the old #b85a08 when the token moved to
// #ad5407 for AA contrast, and the card quietly drifted away from the app.
const COLORS = { ink: '#1a1f2b', ink2: '#454d5c', ink3: '#616978', line: '#e0e3e8', primary: '#1b6ef3', primaryStrong: '#1256c7', a: '#1256c7', b: '#ad5407', soft: '#f1f4f9', positive: '#167a4a', negative: '#cf3a2e' };

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

export function renderShareCard(canvas: HTMLCanvasElement, data: ShareCardData, scale = 2): void {
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  // No decorative wash. The app dropped gradients and soft fills in favour of rules and whitespace,
  // and this image is the most public thing the brand puts out — it should look like the product.
  // Accent bar: the winner's colour, kept as a brand device but thinner than the old 10px slab.
  const accent = data.summary.winner === 'a' ? '#1b6ef3' : data.summary.winner === 'b' ? '#f0811f' : '#1b6ef3';
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 6);

  // Header: mark + wordmark + calculator name
  drawMark(ctx, 56, 44, 44);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText('TrueCost', 112, 74);
  const tw = ctx.measureText('TrueCost').width;
  ctx.fillStyle = COLORS.primary;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText('Lab', 112 + tw + 8, 74);
  ctx.fillStyle = COLORS.ink3;
  ctx.font = `500 16px ${FONT}`;
  const label = data.scenarioName ? `${data.calculatorName} · ${data.scenarioName}` : data.calculatorName;
  ctx.textAlign = 'right';
  ctx.fillText(label.length > 70 ? label.slice(0, 68) + '…' : label, W - 56, 72);
  ctx.textAlign = 'left';

  // Headline
  ctx.fillStyle = COLORS.ink3;
  ctx.font = `700 14px ${FONT}`;
  ctx.fillText('THE ANSWER', 56, 140);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 44px ${FONT}`;
  const headLines = wrap(ctx, data.summary.headline, 700).slice(0, 3);
  let y = 192;
  for (const l of headLines) {
    ctx.fillText(l, 56, y);
    y += 54;
  }
  // Sub
  ctx.fillStyle = COLORS.ink2;
  ctx.font = `400 20px ${FONT}`;
  const subLines = wrap(ctx, data.summary.sub, 700).slice(0, 3);
  y += 4;
  for (const l of subLines) {
    ctx.fillText(l, 56, y);
    y += 30;
  }

  /*
   * Figures down the right, as ruled ledger columns rather than a rounded bordered panel.
   *
   * The old treatment was an 18px-radius white box with a border — the card idiom the app removed
   * everywhere else. These now match `.stat` in the answer hero exactly: a rule on top carrying the
   * option's colour, the label under it, the figure beneath.
   */
  const rows = data.summary.rows.slice(0, 5);
  if (rows.length) {
    const px = 812;
    const pw = 332;
    let ry = 132;
    for (const r of rows) {
      const tone = r.tone === 'a' ? COLORS.a : r.tone === 'b' ? COLORS.b : r.tone === 'positive' ? COLORS.positive : r.tone === 'negative' ? COLORS.negative : COLORS.ink;
      // The rule states which option the figure belongs to; neutral rows get a plain hairline.
      ctx.fillStyle = r.tone === 'a' || r.tone === 'b' ? tone : COLORS.line;
      ctx.fillRect(px, ry, pw, 2);
      ctx.fillStyle = COLORS.ink3;
      ctx.font = `500 14px ${FONT}`;
      ctx.fillText(r.label.length > 34 ? r.label.slice(0, 33) + '…' : r.label, px, ry + 24);
      ctx.font = `600 24px ${FONT}`;
      ctx.fillStyle = tone;
      ctx.fillText(r.value, px, ry + 52);
      ry += 76;
      if (ry > 500) break;
    }
  }

  // Footer
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(56, H - 84, W - 112, 1);
  ctx.fillStyle = COLORS.ink3;
  ctx.font = `500 15px ${FONT}`;
  ctx.fillText('Illustrative estimate based on the assumptions shown in the tool · not financial advice', 56, H - 52);
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.primaryStrong;
  ctx.font = `600 15px ${FONT}`;
  ctx.fillText('TrueCost Lab · a Cents of Adventure tool', W - 56, H - 52);
  ctx.textAlign = 'left';
}

export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
