import type { ShareSummary } from '../calculators/types';

/** Plain-text summary for clipboard / messaging apps. */
export function buildSummaryText(calculatorName: string, summary: ShareSummary, url?: string, scenarioName?: string): string {
  const lines: string[] = [];
  lines.push(`TrueCost Lab — ${calculatorName}${scenarioName ? ` (${scenarioName})` : ''}`);
  lines.push('');
  lines.push(summary.headline);
  if (summary.sub) lines.push(summary.sub);
  if (summary.rows.length) {
    lines.push('');
    const w = Math.max(...summary.rows.map((r) => r.label.length));
    for (const r of summary.rows) lines.push(`${r.label.padEnd(w)}  ${r.value}`);
  }
  lines.push('');
  if (url) lines.push(`Open and edit the assumptions: ${url}`);
  lines.push('Illustrative estimate from the assumptions entered — not financial advice. Projected returns are not guaranteed.');
  lines.push('TrueCost Lab · a Cents of Adventure tool');
  return lines.join('\n');
}
