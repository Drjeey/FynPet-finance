// Pure helpers for the Fyn AI panel: no DOM, storage or network.

// Sorts a failed AI request into the state the panel should show.
export function classifyAiError(error) {
  const text = String(error?.message ?? error ?? '').toLowerCase();
  if (/sign in to use/.test(text)) return 'signin';
  if (/until you agree|off until/.test(text)) return 'consent';
  if (/daily ai limit|midnight utc/.test(text)) return 'limit';
  if (/failed to fetch|fetch failed|network|could not reach|offline/.test(text)) return 'network';
  if (/too many requests|busy|overloaded|ai request failed \(5\d\d\)|\b(429|502|503|504|529)\b/.test(text)) return 'busy';
  return 'other';
}

// Pulls a closing "Next step: ..." line out of an answer so it can be shown on its own.
export function splitNextStep(text) {
  const lines = String(text ?? '').replace(/\r/g, '').split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^\s*(?:\*\*)?next step\s*(?::\s*\*\*|\*\*\s*:|:)\s*(.+)$/i);
    if (m && m[1].trim()) return { body: lines.slice(0, i).join('\n').trim(), next: m[1].replace(/\*\*/g, '').trim() };
    if (lines[i].trim()) break;
  }
  return { body: String(text ?? '').trim(), next: '' };
}

export const greeting = name => `Hi ${String(name ?? '').trim() || 'there'}. Ask me about your spending, budgets or savings.`;

const pct = value => { const n = parseFloat(value); return Number.isFinite(n) ? n : 0; };

// Four plain rows for the Insights tab. Status is always given in words (tone drives colour only).
export function insightRows({ savingsRate, emergencyMonths, netCashFlow, independencePct }, fmtKes) {
  const sr = pct(savingsRate), em = pct(emergencyMonths), nc = Number(netCashFlow) || 0, ip = pct(independencePct);
  return [
    { key: 'saving', title: 'Savings rate', figure: `${Math.round(sr)}%`, word: sr >= 20 ? 'Good' : sr >= 10 ? 'Fair' : 'Low, aim for 20%', tone: sr >= 20 ? 'good' : sr >= 10 ? 'warn' : 'bad' },
    { key: 'cover', title: 'Emergency fund', figure: `${em.toFixed(1)} months`, word: em >= 6 ? 'Strong' : em >= 3 ? 'Good' : 'Low, aim for 3', tone: em >= 3 ? 'good' : 'warn' },
    { key: 'flow', title: 'Net cash flow', figure: `${nc > 0 ? '+' : nc < 0 ? '-' : ''}${fmtKes(Math.abs(nc))}`, word: nc > 0 ? 'Positive' : nc < 0 ? 'Negative' : 'Break-even', tone: nc > 0 ? 'good' : nc < 0 ? 'bad' : 'warn' },
    { key: 'goal', title: 'Independence progress', figure: `${ip.toFixed(1)}%`, word: ip >= 50 ? 'Well on the way' : ip >= 20 ? 'Building' : 'Early days', tone: ip >= 20 ? 'good' : 'warn' },
  ];
}

// "17 Nov" for history rows.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// What the chat area should show instead of the conversation, or '' when the user can ask.
export function panelState({ signedIn, hasData, limited }) {
  if (!signedIn) return 'signin';
  if (!hasData) return 'nodata';
  if (limited) return 'limit';
  return '';
}
