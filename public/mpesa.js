// Reads Safaricom M-Pesa statements without AI: pure text rules, no DOM, storage or network.
//
// A statement row reads (one line, or wrapped across a few):
//   <Receipt No.> <Completion Time> <Details> <Transaction Status> <Paid In> <Withdrawn> <Balance>
//   SGH4XK2LMN  2026-11-10 14:23:05  Pay Bill to 888880 - KPLC PREPAID Acc. 1234  COMPLETED  -1,500.00  3,250.00
// Empty cells produce no text, so a row usually has two numbers after the status: the amount and the balance.
// Money out is normally negative; when the sign is missing, the change in the running balance decides.
//
// NOT YET CHECKED against a real statement PDF: built from the published layout. When too few rows can be
// read, `recognized` is false and the app falls back to Fyn AI instead of guessing.
//
// Output rows match what the AI import returns: { description, amount, type, category, date, receipt }.

const MAX_AMOUNT = 1e9;
const ANCHOR = /\b([A-Z0-9]{10})\s+(\d{4}-\d{2}-\d{2}|\d{2}[/.-]\d{2}[/.-]\d{4})[ T]+(\d{1,2}:\d{2}(?::\d{2})?)/g;
const STATUS = /\b(completed|failed|reversed|cancelled|canceled|expired|declined)\b/i;
const MONEY = /-?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}(?!\d)/g;
const money = text => Number(text.replace(/,/g, ''));
const cents = value => Math.round(value * 100);

// "10/11/2026" (day first, as printed in Kenya) or "2026-11-10" → "2026-11-10"; null when not a real date.
export function isoDate(text) {
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/) || text.match(/^(\d{2})[/.-](\d{2})[/.-](\d{4})$/);
  if (!m) return null;
  const [y, mo, d] = m[1].length === 4 ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]];
  const iso = `${y}-${mo}-${d}`, check = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(check.getTime()) && check.toISOString().slice(0, 10) === iso ? iso : null;
}

// ── What kind of transaction the Details column describes ──
// Each rule: [pattern, kind]. Order matters: the first match wins.
const KINDS = [
  [/\bcharge\b/i, 'charge'],
  [/fuliza|overdraft|od loan/i, 'fuliza'],
  [/m-?shwari|kcb m-?pesa|lock savings|\bsacco\b|ziidi|money market/i, 'savings'],
  [/airtime|bundle/i, 'airtime'],
  [/withdrawal|withdraw at|atm/i, 'cash-out'],
  [/deposit of funds|deposit at agent|cash deposit/i, 'cash-in'],
  [/funds received|received from|business payment from|salary|b2c|promotion payment|payment from/i, 'received'],
  [/customer transfer|send money|transfer to|sent to/i, 'sent'],
  [/pay ?bill|merchant payment|buy goods|till|payment to small business|customer payment to|online payment/i, 'paid'],
];
export const kindOf = details => (KINDS.find(([re]) => re.test(details)) || [null, 'unknown'])[1];

// Merchant names → category, for bills and shop payments (the same hints the AI was given, and a few more).
const MERCHANTS = [
  [/naivas|quick ?mart|carrefour|chandarana|tuskys|magunas|cleanshelf|eastmatt|majid|java house|kfc|chicken inn|pizza|restaurant|cafe|butchery|supermarket|grocer/i, 'food'],
  [/uber|bolt|little cab|faras|petrol|fuel|shell|totalenergies|total energies|rubis|vivo energy|matatu|sacco bus|kenya railways|\bsgr\b|parking|easy ?coach|mash poa/i, 'transport'],
  [/kplc|kenya power|water|zuku|safaricom home|faiba|airtel|telkom|\bwifi\b|internet|nhif|\bsha\b|rent|landlord/i, 'utilities'],
  [/netflix|dstv|showmax|gotv|startimes|spotify|cinema|imax|sportpesa|betika|odibets|mozzart/i, 'entertainment'],
  [/pharmac|chemist|hospital|clinic|medical|dental|lab(?:oratory)?\b|optic/i, 'health'],
  [/jumia|kilimall|hotpoint|\bgame\b|shoe|fashion|boutique|clothing|electronics|mall\b/i, 'shopping'],
];
export const merchantCategory = text => (MERCHANTS.find(([re]) => re.test(text)) || [null, null])[1];

// Readable counterparty: drop Safaricom's lead-in words, till/paybill numbers, account numbers and masked phone numbers.
export function counterparty(details) {
  let text = ` ${details} `
    .replace(/\b(?:customer transfer of funds|customer transfer|customer send money|send money|funds received|received|business payment|merchant payment|pay ?bill(?: online)?|buy goods|customer payment|payment|transfer|deposit of funds|withdrawal)\b(?:\s+(?:to|from|at))?/gi, ' ')
    .replace(/\b(?:customer|agent|till|online|via api)\b/gi, ' ')
    .replace(/\b(?:acc(?:ount)?\.?\s*(?:no\.?)?\s*\S+)/gi, ' ')
    .replace(/\b(?:\+?254|0)[\d*xX]{6,}\b/g, ' ')        // phone numbers (statements mask them; drop them anyway)
    .replace(/\b\d{4,8}\b/g, ' ')                        // till and paybill numbers
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return text;
}

function describe(kind, details, direction) {
  const who = counterparty(details);
  if (kind === 'airtime') return /bundle/i.test(details) ? 'Data bundles' : 'Airtime';
  if (kind === 'cash-out') return who ? `Cash withdrawal - ${who}` : 'Cash withdrawal';
  if (kind === 'cash-in') return who ? `Cash deposit - ${who}` : 'Cash deposit';
  if (kind === 'savings') return /m-?shwari/i.test(details) ? (direction === 'in' ? 'From M-Shwari' : 'To M-Shwari')
    : /kcb/i.test(details) ? (direction === 'in' ? 'From KCB M-Pesa' : 'To KCB M-Pesa') : details;
  if (kind === 'fuliza') return direction === 'in' ? 'Fuliza loan' : 'Fuliza repayment';
  if (kind === 'sent' && who) return `To ${who}`;
  if (kind === 'received' && who) return `From ${who}`;
  return who || details;
}

// Type and category for one row, from what the wording says and which way the money moved.
export function categorise(kind, details, direction) {
  if (direction === 'in') {
    if (kind === 'received') return { type: 'income', category: 'income' };
    if (['savings', 'cash-in', 'fuliza', 'sent'].includes(kind)) return { type: 'transfer', category: 'transfer' };
    return { type: 'income', category: 'other' };                       // unknown money in: the person checks it
  }
  if (kind === 'savings') return { type: 'savings', category: 'savings' };
  if (kind === 'sent' || kind === 'cash-out') return { type: 'transfer', category: 'transfer' };
  if (kind === 'airtime') return { type: 'expense', category: 'utilities' };
  return { type: 'expense', category: merchantCategory(details) || 'other' };
}

// Find the rows. Returns { rows: [{ receipt, date, time, details, status, amounts: [..] }], unreadable }
export function splitRows(text) {
  const source = String(text || '').replace(/\r/g, '');
  const anchors = [...source.matchAll(ANCHOR)].filter(m => /[A-Z]/.test(m[1]) && /\d/.test(m[1]) && isoDate(m[2]));
  const rows = [];
  let unreadable = 0;
  anchors.forEach((m, i) => {
    const body = source.slice(m.index + m[0].length, i + 1 < anchors.length ? anchors[i + 1].index : source.length);
    const status = body.match(STATUS);
    if (!status) { unreadable++; return; }
    const details = body.slice(0, status.index).replace(/\s+/g, ' ').trim();
    // Only the numbers straight after the status belong to this row; stop at the first other text
    // (a page footer or disclaimer after the last row can contain numbers too).
    const cells = body.slice(status.index + status[0].length).match(/^(?:\s*-?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}(?!\d)){1,3}/);
    const amounts = (cells ? cells[0].match(MONEY) : []).map(money);
    if (!details || amounts.length < 2) { unreadable++; return; }
    rows.push({ receipt: m[1], date: isoDate(m[2]), time: m[3].padStart(5, '0'), details, status: status[1].toLowerCase(), amounts, order: i });
  });
  return { rows, unreadable };
}

// Amount and direction from the numbers after the status. direction is 'in', 'out' or null (decided by the balance).
function readAmounts(amounts) {
  const balance = amounts.at(-1);
  if (amounts.length >= 3) {
    const [paidIn, withdrawn] = amounts;
    if (Math.abs(paidIn) > 0 && Math.abs(withdrawn) === 0) return { amount: Math.abs(paidIn), direction: 'in', balance };
    if (Math.abs(withdrawn) > 0 && Math.abs(paidIn) === 0) return { amount: Math.abs(withdrawn), direction: 'out', balance };
  }
  const value = amounts[0];
  return { amount: Math.abs(value), direction: value < 0 ? 'out' : null, balance };
}

// Used only when neither the sign nor the running balance says which way the money went.
const DEFAULT_DIRECTION = { received: 'in', 'cash-in': 'in', sent: 'out', paid: 'out', airtime: 'out', 'cash-out': 'out', charge: 'out' };
const defaultDirection = (kind, details) =>
  kind === 'savings' || kind === 'fuliza' ? (/withdraw|from|loan$|overdraft of credit/i.test(details) ? 'in' : 'out') : DEFAULT_DIRECTION[kind] || null;

// Read a whole statement.
// Returns {
//   recognized,            true when enough rows were read to trust this reader (otherwise use Fyn AI)
//   rows,                  completed transactions, ready for the review screen (charges left out)
//   unreadable,            rows we found but could not read
//   notCompleted,          failed / reversed / cancelled rows (skipped, as on the statement they moved no money)
//   charges: { count, total },   M-Pesa fees found (not imported, as before)
//   balance: { checked, mismatches }   how many rows were checked against the running balance, and how many disagreed
// }
export function parseStatement(text) {
  const { rows: found, unreadable: noRead } = splitRows(text);
  let unreadable = noRead, notCompleted = 0;
  const done = [];
  for (const row of found) {
    if (row.status !== 'completed') { notCompleted++; continue; }
    const kind = kindOf(row.details), { amount, direction, balance } = readAmounts(row.amounts);
    if (!(amount > 0) || amount > MAX_AMOUNT) { unreadable++; continue; }
    done.push({ ...row, kind, amount, direction, balance });
  }

  // Oldest first (statements usually list the newest first). Same-second rows keep the statement's own order.
  const newestFirst = done.length > 1 && `${done[0].date} ${done[0].time}` > `${done.at(-1).date} ${done.at(-1).time}`;
  const chrono = newestFirst ? [...done].reverse() : done;

  // Running balance: each row's balance should be the previous balance plus money in, minus money out.
  let checked = 0, mismatches = 0;
  chrono.forEach((row, i) => {
    const prev = chrono[i - 1];
    if (!prev) return;
    const delta = cents(row.balance) - cents(prev.balance), amt = cents(row.amount);
    if (!row.direction) {
      if (delta === amt) row.direction = 'in';
      else if (delta === -amt) row.direction = 'out';
    }
    if (row.direction) { checked++; if (delta !== (row.direction === 'in' ? amt : -amt)) mismatches++; }
  });

  let chargeCount = 0, chargeTotal = 0;
  const rows = [];
  for (const row of chrono) {
    const direction = row.direction || defaultDirection(row.kind, row.details);
    if (!direction) { unreadable++; continue; }
    if (row.kind === 'charge') { chargeCount++; chargeTotal += cents(row.amount); continue; }
    const { type, category } = categorise(row.kind, row.details, direction);
    const description = describe(row.kind, row.details, direction).slice(0, 200) || 'M-Pesa transaction';
    rows.push({ description, amount: cents(row.amount) / 100, type, category, date: row.date, receipt: row.receipt });
  }

  const total = found.length + noRead;   // every anchor we saw
  const recognized = rows.length > 0 && unreadable <= Math.max(1, Math.floor(total * 0.2));
  return { recognized, rows, unreadable, notCompleted, charges: { count: chargeCount, total: chargeTotal / 100 }, balance: { checked, mismatches } };
}
