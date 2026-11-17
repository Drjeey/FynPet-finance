import { DEFAULT_RATES, convertToKes, amountKes, sumKes, categoryTotals, nairobiDate, monthKey, periodBounds, periodStats, chartSeries, emergencyFundMonths, monthSummary, daysLeftInMonth, categoryShares, niceScale } from './calc.js';
import { icon, renderIcons } from './icons.js';
import { pendingRecords, markSynced, addTombstone, mergeRemote } from './sync.js';
import { csvText, csvRow } from './csv.js';
import { filterTransactions, countFilters, quickRange, groupByDate } from './txfilter.js';
import { budgetRows, budgetSummary, lastMonthSpent, categoryChoices, suggestRaise } from './budgets.js';
import { splitChunks, dedupeWithinFile, classifyRows, statementTotals, reconcile, importStatus, failureReason } from './importreview.js';
import { quickCategories, categoryForDescription, defaultCategory, defaultDescription, parseAmount } from './addflow.js';

// ═══════════════════════════════════════════════════════════
// FYNPET — FULL STACK ENGINE
// localStorage + Supabase sync + Claude AI Financial Advisor
// ═══════════════════════════════════════════════════════════

// ── NETLIFY API ───────────────────────────────────────────
// Same-origin Netlify Functions (netlify/functions/). Secrets live in
// Netlify environment variables and never reach the browser.
const API = { config: '/api/config', ai: '/api/ai' };

async function initCloudConfig() {
  try {
    const res = await fetch(API.config);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cfg = await res.json();
    window._cloudConfig = cfg;
    // Initialize Supabase with values from Netlify environment variables
    const publicKey = cfg.supabasePublicKey || cfg.supabaseAnonKey;
    if (cfg.supabaseUrl && publicKey) {
      sbClient = supabase.createClient(cfg.supabaseUrl, publicKey);
      // Listen for sign-in / sign-out events
      sbClient.auth.onAuthStateChange((event, session) => {
        // Defer: supabase-js warns against awaiting its own calls inside this callback.
        if (event === 'SIGNED_IN' && session) setTimeout(() => onSignedIn(session), 0);
        if (event === 'SIGNED_OUT') setSyncStatus('local', 'Signed out — local only');
      });
      // Check for existing session (returning user)
      const { data: { session } } = await sbClient.auth.getSession();
      if (session) {
        await onSignedIn(session);
      } else {
        showLocalProfile();
        setSyncStatus('local', 'Sign in to sync');
        setTimeout(() => openModal('auth-modal'), 1000);
      }
    } else {
      showLocalProfile();
    }
    updateCloudStatus('claude', cfg.aiEnabled, cfg.aiEnabled ? '✓ Ready (sign in to use)' : '⚠ Not configured in Netlify');
    updateCloudStatus('sb', Boolean(cfg.supabaseUrl && publicKey),
      cfg.supabaseUrl && publicKey ? '✓ Available — sign in to sync' : '⚠ Supabase URL or public key not set in Netlify');
  } catch(e) {
    showLocalProfile();
    updateCloudStatus('claude', false, '✕ Server unreachable');
    updateCloudStatus('sb', false, '✕ Server unreachable');
  }
}

async function recheckCloudConfig() {
  updateCloudStatus('claude', null, 'Checking…');
  updateCloudStatus('sb', null, 'Checking…');
  sbClient = null;
  await initCloudConfig();
}

// Current Supabase access token, or null when signed out / local only.
async function getAccessToken() {
  const sb = getSbClient();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  return session?.access_token || null;
}

// POST to the AI function. Returns parsed JSON or throws an Error with a user-facing message.
// One-time consent before any data is sent to Anthropic. Bump the version if what is sent changes.
const AI_CONSENT_VERSION = '1';
let _consentResolve = null;
function ensureAiConsent() {
  if (CFG.get('aiConsent') === AI_CONSENT_VERSION) return Promise.resolve(true);
  openModal('ai-consent-modal');
  return new Promise(resolve => { _consentResolve = resolve; });
}
function answerAiConsent(agreed) {
  if (agreed) CFG.set('aiConsent', AI_CONSENT_VERSION);
  const resolve = _consentResolve; _consentResolve = null;
  closeModal('ai-consent-modal');
  resolve?.(agreed);
}

async function postAi(body) {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in to use AI features.');
  if (!(await ensureAiConsent())) throw new Error('AI features are off until you agree to send data to Claude.');
  const res = await fetch(API.ai, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || (res.status === 429 ? 'Too many requests — wait a minute and try again.' : `AI request failed (${res.status}).`));
  return data;
}

function updateCloudStatus(service, ok, text) {
  const id = service === 'claude' ? 'claude-status' : 'sb-status';
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'sb-key-status ' + (ok === true ? 'ok' : ok === false ? 'err' : 'none');
  el.style.margin = '0';
}

// ── CONFIG STORE ──────────────────────────────────────────
const CFG = {
  get: k => localStorage.getItem('fynpet_cfg_'+k) || '',
  set: (k,v) => localStorage.setItem('fynpet_cfg_'+k, typeof v === 'string' ? v : JSON.stringify(v)),
  getNum: (k,def) => parseFloat(localStorage.getItem('fynpet_cfg_'+k)) || def,
};

// ── DATA STORE ────────────────────────────────────────────
// Data is cached per profile so accounts never mix on a shared device:
//   'local'   → fynpet_<key>            (not signed in; also the pre-v5.1 layout)
//   <userId>  → fynpet_u_<userId>_<key> (signed in; cleared on sign-out)
// 'tombstones' = deletes not yet confirmed by the server; 'syncmeta' = last push time and per-table pull cursors.
const DATA_KEYS = ['transactions', 'budgets', 'imports', 'advisor_history', 'tombstones', 'syncmeta'];
let activeProfile = localStorage.getItem('fynpet_profile') || 'local';
function storeKey(k, p = activeProfile) { return p === 'local' ? 'fynpet_' + k : `fynpet_u_${p}_${k}`; }
const Store = {
  get: (k, p) => { try { return JSON.parse(localStorage.getItem(storeKey(k, p))) || [] } catch { return [] } },
  set: (k, v, p) => localStorage.setItem(storeKey(k, p), JSON.stringify(v)),
  clear: p => DATA_KEYS.forEach(k => localStorage.removeItem(storeKey(k, p))),
};
const SyncMeta = {
  get: p => { try { return JSON.parse(localStorage.getItem(storeKey('syncmeta', p))) || {} } catch { return {} } },
  set: (v, p) => localStorage.setItem(storeKey('syncmeta', p), JSON.stringify(v)),
};

// ── RECORD VALIDATION ─────────────────────────────────────
// Everything read from storage, sync or import passes through these, so
// rendering and arithmetic only ever see well-formed values.
const TX_TYPES = ['income', 'expense', 'savings', 'transfer'];
const CAT_KEYS = ['food', 'transport', 'utilities', 'entertainment', 'health', 'shopping', 'savings', 'income', 'transfer', 'other'];
const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'TZS', 'UGX'];
const SOURCES = ['manual', 'import', 'ai', 'synced'];
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const safeId = v => SAFE_ID.test(String(v ?? '')) ? String(v) : null;
const isoTime = v => (v && !Number.isNaN(Date.parse(v))) ? new Date(v).toISOString() : null;

function normalizeTx(t) {
  if (!t || typeof t !== 'object') return null;
  const amount = Math.round(Number(t.amount) * 100) / 100;
  const date = String(t.date || '').slice(0, 10);
  if (!Number.isFinite(amount) || amount <= 0 || !ISO_DATE.test(date)) return null;
  const currency = String(t.currency || 'KES').toUpperCase();
  const createdAt = isoTime(t.createdAt) || new Date().toISOString();
  return {
    id: safeId(t.id) || uid(),
    description: String(t.description || '').trim().slice(0, 300) || '(no description)',
    amount, date, amountKes: amountKes({ ...t, amount, currency: CURRENCIES.includes(currency) ? currency : 'KES' }, exchangeRates()),
    type: TX_TYPES.includes(t.type) ? t.type : 'expense',
    category: CAT_KEYS.includes(t.category) ? t.category : 'other',
    currency: CURRENCIES.includes(currency) ? currency : 'KES',
    notes: String(t.notes || '').slice(0, 500),
    source: SOURCES.includes(t.source) ? t.source : 'manual',
    createdAt, updatedAt: isoTime(t.updatedAt) || createdAt,
    ...(t.dirty ? { dirty: true } : {}), ...(t.syncedAt ? { syncedAt: String(t.syncedAt) } : {}),
    ...(safeId(t.importBatch) ? { importBatch: t.importBatch } : {}),
    ...(/^[A-Z0-9]{8,12}$/.test(t.externalRef || '') ? { externalRef: t.externalRef } : {}),
  };
}
function normalizeBudget(b) {
  const limit = Number(b?.limit);
  if (!b || !CAT_KEYS.includes(b.category) || !Number.isFinite(limit) || limit <= 0) return null;
  return { id: safeId(b.id) || uid(), category: b.category, limit, period: 'monthly', ...(isoTime(b.updatedAt) ? { updatedAt: isoTime(b.updatedAt) } : {}),
    ...(b.dirty ? { dirty: true } : {}), ...(b.syncedAt ? { syncedAt: String(b.syncedAt) } : {}) };
}
function normalizeTombstone(t) {
  if (!t || !['transactions', 'budgets'].includes(t.table) || !safeId(t.id)) return null;
  return { table: t.table, id: t.id, deletedAt: isoTime(t.deletedAt) || new Date().toISOString() };
}
function normalizeImport(i) {
  if (!i || typeof i !== 'object') return null;
  const count = value => Math.max(0, parseInt(value, 10) || 0);
  return { id: safeId(i.id) || uid(), filename: String(i.filename || 'statement.pdf').slice(0, 200),
    count: count(i.count), skipped: count(i.skipped), rejected: count(i.rejected), date: isoTime(i.date) || new Date().toISOString(),
    status: ['success', 'partial', 'failed'].includes(i.status) ? i.status : 'success',
    ...(i.reason ? { reason: String(i.reason).slice(0, 60) } : {}) };
}
function normalizeAdvice(h) {
  if (!h || typeof h !== 'object' || !h.prompt) return null;
  return { id: safeId(h.id) || uid(), prompt: String(h.prompt).slice(0, 4000), response: String(h.response || '').slice(0, 20000),
    timestamp: isoTime(h.timestamp) || new Date().toISOString(), ...(h.context ? { context: h.context } : {}) };
}
const normalizeList = (list, fn) => (Array.isArray(list) ? list : []).map(fn).filter(Boolean);

function loadProfileData(p = activeProfile) {
  const data = {
    transactions: normalizeList(Store.get('transactions', p), normalizeTx),
    budgets: normalizeList(Store.get('budgets', p), normalizeBudget),
    imports: normalizeList(Store.get('imports', p), normalizeImport),
    advisorHistory: normalizeList(Store.get('advisor_history', p), normalizeAdvice),
    tombstones: p === 'local' ? [] : normalizeList(Store.get('tombstones', p), normalizeTombstone),
  };
  // Persist the cleaned records so replaced IDs stay stable across reloads.
  Store.set('transactions', data.transactions, p); Store.set('budgets', data.budgets, p);
  Store.set('imports', data.imports, p); Store.set('advisor_history', data.advisorHistory, p);
  if (p !== 'local') Store.set('tombstones', data.tombstones, p);
  return data;
}

// ── SUPABASE CLIENT ────────────────────────────────────────
let sbClient = null;
function getSbClient() {
  if (sbClient) return sbClient;
  const cfg = window._cloudConfig;
  const publicKey = cfg?.supabasePublicKey || cfg?.supabaseAnonKey;
  if (!cfg?.supabaseUrl || !publicKey) return null;
  sbClient = supabase.createClient(cfg.supabaseUrl, publicKey);
  return sbClient;
}

// ── STATE ─────────────────────────────────────────────────
const state = {
  ...loadProfileData(),
  ui: { txFilter: 'all', txSearch: '', txCats: [], txFrom: '', txTo: '', txPage: 1, txLimit: 20, perPage: 12, editTxId: null, editBudgetId: null, advisorOpen: false, advisorTab: 'chat' },
  pendingDel: { type: null, id: null },
  selectedFile: null,
};

// ── CATEGORY META ─────────────────────────────────────────
const CATS = {
  food:          { icon:'◆', label:'Food & Groceries',  color:'#60a5fa', bg:'rgba(96,165,250,.14)' },
  transport:     { icon:'◆', label:'Transport',          color:'#a78bfa', bg:'rgba(167,139,250,.14)' },
  utilities:     { icon:'◆', label:'Utilities',          color:'#2dd4bf', bg:'rgba(45,212,191,.14)' },
  entertainment: { icon:'◆', label:'Entertainment',      color:'#fbbf24', bg:'rgba(251,191,36,.14)' },
  health:        { icon:'◆', label:'Health',             color:'#22d3ee', bg:'rgba(34,211,238,.14)' },
  shopping:      { icon:'◆', label:'Shopping',           color:'#d4a373', bg:'rgba(212,163,115,.16)' },
  savings:       { icon:'◆', label:'Savings',            color:'#818cf8', bg:'rgba(129,140,248,.16)' },
  income:        { icon:'◆', label:'Income',             color:'#34d399', bg:'rgba(52,211,153,.14)' },
  transfer:      { icon:'◆', label:'Transfer',           color:'#cbd5e1', bg:'rgba(203,213,225,.14)' },
  other:         { icon:'◆', label:'Other',              color:'#94a3b8', bg:'rgba(148,163,184,.14)' },
};

// ═══════════════════════════════════════════════════════════
// FINANCIAL ANALYSIS ENGINE — feeds the AI advisor
// ═══════════════════════════════════════════════════════════
function buildFinancialContext() {
  const txs = state.transactions;
  const budgets = state.budgets;
  const now = new Date();
  const thisMonth = monthKey(now);

  // Current month stats
  const thisMonthTx = txs.filter(t => t.date && t.date.startsWith(thisMonth));
  const income = totalKes(thisMonthTx.filter(t=>t.type==='income'));
  const expenses = totalKes(thisMonthTx.filter(t=>t.type==='expense'));
  const savings = totalKes(thisMonthTx.filter(t=>t.type==='savings'));
  const savingsRate = income>0 ? ((savings/income)*100).toFixed(1) : '0.0';

  // All-time totals
  const totalIncome = totalKes(txs.filter(t=>t.type==='income'));
  const totalExpenses = totalKes(txs.filter(t=>t.type==='expense'));
  const totalSaved = totalKes(txs.filter(t=>t.type==='savings'));
  const netWorth = totalIncome - totalExpenses;

  // Category breakdown this month
  const catBreakdown = categoryTotals(thisMonthTx, { type: 'expense' }, exchangeRates());
  const topCategories = Object.entries(catBreakdown)
    .sort((a,b)=>b[1]-a[1])
    .map(([cat,amt]) => `${CATS[cat]?.label||cat}: KES ${amt.toLocaleString()}`)
    .join(', ');

  // Budget performance
  const budgetStatus = budgets.map(b => {
    const spent = totalKes(thisMonthTx.filter(t=>t.type==='expense'&&t.category===b.category));
    const pct = b.limit>0 ? ((spent/b.limit)*100).toFixed(0) : 0;
    const status = spent > b.limit ? 'OVER BUDGET' : spent > b.limit*0.8 ? 'Near limit' : 'On track';
    return `${CATS[b.category]?.label||b.category}: KES ${spent.toLocaleString()} / KES ${b.limit.toLocaleString()} (${pct}% — ${status})`;
  }).join('\n');

  // 6-month trend
  const monthTrend = [];
  for (let i=5; i>=0; i--) {
    const m = new Date(monthKey(now,-i)+'-01T12:00:00Z');
    const ms = monthKey(now,-i);
    const mInc = totalKes(txs.filter(t=>t.date?.startsWith(ms)&&t.type==='income'));
    const mExp = totalKes(txs.filter(t=>t.date?.startsWith(ms)&&t.type==='expense'));
    const mSav = totalKes(txs.filter(t=>t.date?.startsWith(ms)&&t.type==='savings'));
    if (mInc+mExp+mSav > 0) {
      monthTrend.push(`${m.toLocaleString('en',{month:'short',year:'2-digit'})}: Income=${mInc.toLocaleString()}, Expenses=${mExp.toLocaleString()}, Saved=${mSav.toLocaleString()}`);
    }
  }

  // Emergency fund
  const emergencyMonths = emergencyFundMonths(txs, now, exchangeRates()).toFixed(1);

  // FIRE
  const fireTarget = CFG.getNum('fireTarget', 3000000);
  const firePct = fireTarget > 0 ? ((totalSaved/fireTarget)*100).toFixed(1) : '0';

  // Recent transactions (last 10)
  const recentTx = [...txs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10)
    .map(t=>`${t.date} | ${t.type} | ${CATS[t.category]?.label||t.category} | KES ${txAmountKes(t).toLocaleString()} | ${t.description}`)
    .join('\n');

  return {
    summary: {
      thisMonth: { income, expenses, savings, savingsRate: savingsRate+'%' },
      allTime: { totalIncome, totalExpenses, totalSaved, netWorth },
      emergencyFundMonths: emergencyMonths,
      fireProgress: firePct+'%',
      fireTarget: `KES ${fireTarget.toLocaleString()}`,
      totalTransactions: txs.length,
    },
    topCategories,
    budgetStatus: budgetStatus || 'No budgets configured',
    monthlyTrend: monthTrend.join('\n') || 'Insufficient data',
    recentTransactions: recentTx || 'No transactions yet',
    userName: CFG.get('name') || 'User',
  };
}

// The data block sent to /api/ai. The advisor's instructions live server-side
// in netlify/functions/ai.mjs so the browser cannot change them.
function buildFinancialDataBlock(ctx) {
  return `USER: ${ctx.userName}

CURRENT MONTH CASHFLOW:
• Income: KES ${ctx.summary.thisMonth.income.toLocaleString()}
• Expenses: KES ${ctx.summary.thisMonth.expenses.toLocaleString()}
• Saved: KES ${ctx.summary.thisMonth.savings.toLocaleString()}
• Savings Rate: ${ctx.summary.thisMonth.savingsRate}

ALL-TIME TOTALS:
• Total Income Recorded: KES ${ctx.summary.allTime.totalIncome.toLocaleString()}
• Total Expenses Recorded: KES ${ctx.summary.allTime.totalExpenses.toLocaleString()}
• Total Saved: KES ${ctx.summary.allTime.totalSaved.toLocaleString()}
• Net Balance: KES ${ctx.summary.allTime.netWorth.toLocaleString()}
• Transactions on record: ${ctx.summary.totalTransactions}

SPENDING BY CATEGORY (this month):
${ctx.topCategories || 'No expense data this month'}

BUDGET PERFORMANCE:
${ctx.budgetStatus}

6-MONTH TREND:
${ctx.monthlyTrend}

FINANCIAL HEALTH METRICS:
• Emergency Fund: ${ctx.summary.emergencyFundMonths} months covered (target: 6 months)
• FIRE Progress: ${ctx.summary.fireProgress} of ${ctx.summary.fireTarget}

RECENT TRANSACTIONS (last 10):
${ctx.recentTransactions}`;
}

// ═══════════════════════════════════════════════════════════
// CLAUDE API — via the same-origin Netlify Function /api/ai
// The function verifies the Supabase session, applies rate limits,
// builds the prompt and holds the Anthropic key (Netlify env var).
// ═══════════════════════════════════════════════════════════
async function callClaude(userMessage) {
  try {
    const data = await postAi({
      mode: 'advisor',
      context: buildFinancialDataBlock(buildFinancialContext()),
      message: userMessage,
    });
    return { error: false, text: data.text || 'Empty response.' };
  } catch(e) {
    return { error: true, text: e.message === 'Failed to fetch' ? 'Could not reach the server. Check your connection and try again.' : e.message };
  }
}

// ─── Format markdown-style bold and special tokens ────────
// Escapes first, then applies a small set of formatting rules, so model output can never inject HTML.
function formatMsg(text) {
  return escHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/KES ([\d,]+)/g, '<span class="amt">KES $1</span>')
    .replace(/\+(\d[\d,.]+%?)/g, '<span class="positive">+$1</span>')
    .replace(/\b(OVER BUDGET|over budget)\b/g, '<span class="negative">$&</span>')
    .replace(/\b(⚠️|Warning:|Alert:)/g, '<span class="warning">$1</span>')
    .replace(/\n/g, '<br>');
}

// ─── Advisor UI ────────────────────────────────────────────
function toggleAdvisor() {
  const panel = document.getElementById('advisor-panel');
  const main = document.getElementById('main');
  const backdrop = document.getElementById('advisor-backdrop');
  state.ui.advisorOpen = !state.ui.advisorOpen;
  document.body.classList.toggle('advisor-open', state.ui.advisorOpen);
  main.inert=state.ui.advisorOpen&&matchMedia('(max-width:768px)').matches;
  panel.inert = !state.ui.advisorOpen;
  panel.setAttribute('aria-hidden', String(!state.ui.advisorOpen));
  if (state.ui.advisorOpen) {
    document.getElementById('sidebar').classList.remove('mob-open');
    document.getElementById('sidebar').inert=matchMedia('(max-width:768px)').matches;
    document.getElementById('mob-overlay').classList.remove('show');
    panel._opener = document.activeElement;
    panel.classList.add('open');
    main.classList.add('panel-open');
    backdrop.classList.add('show');
    document.getElementById('ap-input').focus();
  } else {
    panel.classList.remove('open');
    main.classList.remove('panel-open');
    backdrop.classList.remove('show');
    panel._opener?.focus();
  }
}

function setAdvTab(tab, btn) {
  state.ui.advisorTab = tab;
  document.querySelectorAll('.ap-tab').forEach(t=>t.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('adv-chat-tab').style.display = tab==='chat' ? 'flex' : 'none';
  document.getElementById('adv-insights-tab').style.display = tab==='insights' ? 'block' : 'none';
  document.getElementById('adv-history-tab').style.display = tab==='history' ? 'block' : 'none';
  if (tab==='insights') renderInsightsTab();
  if (tab==='history') renderHistoryTab();
}

function appendMsg(role, text, isTyping=false) {
  const msgs = document.getElementById('ap-messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  const time = new Date().toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'});
  const userName = CFG.get('name') ? CFG.get('name').charAt(0).toUpperCase() : 'Y';
  if (isTyping) {
    div.id = 'typing-msg';
    div.innerHTML = `<div class="msg-av ai" style="font-family:var(--fm);font-size:.75rem">Ai</div><div class="msg-bubble ai"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  } else if (role === 'ai') {
    div.innerHTML = `<div class="msg-av ai" style="font-family:var(--fm);font-size:.75rem">Ai</div><div><div class="msg-bubble ai">${formatMsg(text)}</div><div class="msg-time">${time}</div></div>`;
  } else {
    div.innerHTML = `<div><div class="msg-bubble user">${escHtml(text)}</div><div class="msg-time">${time}</div></div><div class="msg-av user" style="font-family:var(--fm)">${userName}</div>`;
  }
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function removeTyping() {
  document.getElementById('typing-msg')?.remove();
}

async function sendAdvisorMessage() {
  const inp = document.getElementById('ap-input');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = ''; inp.style.height = '';
  document.getElementById('ap-send').disabled = true;

  appendMsg('user', msg);
  const typing = appendMsg('ai', '', true);

  const result = await callClaude(msg);
  removeTyping();
  appendMsg('ai', result.text);
  document.getElementById('ap-send').disabled = false;

  // Save to history
  state.advisorHistory.push({
    id: uid(), prompt: msg, response: result.text,
    timestamp: new Date().toISOString(), context: buildFinancialContext().summary
  });
  Store.set('advisor_history', state.advisorHistory.slice(-100));
  syncAdvisorHistory();
}

function sendQuick(prompt) {
  document.getElementById('ap-input').value = prompt;
  sendAdvisorMessage();
}

function handleAdvisorKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdvisorMessage(); }
}
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ─── Insights tab ──────────────────────────────────────────
function renderInsightsTab() {
  const ctx = buildFinancialContext();
  const s = ctx.summary;
  const factors = [
    { label:'SR', name:'Savings Rate', val:`${s.thisMonth.savingsRate}`, sub:'Target: 20%+', status: parseFloat(s.thisMonth.savingsRate)>=20?'ok':parseFloat(s.thisMonth.savingsRate)>=10?'warn':'bad' },
    { label:'EF', name:'Emergency Fund', val:`${s.emergencyFundMonths} months`, sub:'Target: 6 months', status: parseFloat(s.emergencyFundMonths)>=6?'ok':parseFloat(s.emergencyFundMonths)>=3?'warn':'bad' },
    { label:'NW', name:'Net Balance', val:`KES ${s.allTime.netWorth.toLocaleString()}`, sub:'Income minus expenses', status: s.allTime.netWorth>=0?'ok':'bad' },
    { label:'FI', name:'FIRE Progress', val:`${s.fireProgress}`, sub:`of ${s.fireTarget}`, status: parseFloat(s.fireProgress)>=50?'ok':parseFloat(s.fireProgress)>=20?'warn':'bad' },
  ];
  const statusColors = {
    ok:  { bg:'var(--teallt)',  color:'var(--teal)',  label:'Good' },
    warn:{ bg:'var(--amberlt)', color:'var(--amber)', label:'Fair' },
    bad: { bg:'var(--roselt)',  color:'var(--rose)',  label:'Low'  },
  };
  document.getElementById('adv-insights-tab').innerHTML = `
    <div class="ins-section">
      <div class="ins-sec-title">Financial Health</div>
      ${factors.map(f=>{
        const sc = statusColors[f.status];
        return `<div class="ins-metric-card">
          <div style="font-family:var(--fm);font-size:.75rem;font-weight:700;color:${sc.color};background:${sc.bg};border-radius:4px;padding:3px 5px;flex-shrink:0;min-width:28px;text-align:center">${f.label}</div>
          <div class="imc-info"><div class="imc-name">${f.name}</div><div class="imc-val ${f.status}">${f.val}</div><div class="imc-sub">${f.sub}</div></div>
          <div class="imc-status" style="background:${sc.bg};color:${sc.color};font-family:var(--fm);font-size:.75rem">${sc.label}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="ins-section">
      <div class="ins-sec-title">This Month</div>
      ${[
        {label:'Inc', n:'Income',   v:`KES ${s.thisMonth.income.toLocaleString()}`,   c:'good', color:'var(--teal)'},
        {label:'Exp', n:'Expenses', v:`KES ${s.thisMonth.expenses.toLocaleString()}`, c:'bad',  color:'var(--rose)'},
        {label:'Sav', n:'Saved',    v:`KES ${s.thisMonth.savings.toLocaleString()}`,  c:'good', color:'var(--blue)'},
      ].map(m=>`<div class="ins-metric-card">
        <div style="font-family:var(--fm);font-size:.75rem;font-weight:700;color:${m.color};background:${m.color}18;border-radius:4px;padding:3px 5px;flex-shrink:0;min-width:28px;text-align:center">${m.label}</div>
        <div class="imc-info"><div class="imc-name">${m.n}</div><div class="imc-val ${m.c}">${m.v}</div></div>
      </div>`).join('')}
    </div>
    <div style="padding:0 0 12px">
      <button class="btn-primary" style="width:100%;justify-content:center" data-click="runAiAnalysis">Generate AI Analysis</button>
    </div>`;
}

// ─── History tab ────────────────────────────────────────────
function renderHistoryTab() {
  const hist = state.advisorHistory;
  const el = document.getElementById('adv-history-tab');
  if (!hist.length) { el.innerHTML = '<div class="empty" style="padding:30px"><div class="empty-icon" style="font-family:var(--fm);font-size:1.8rem;color:var(--ink3)">∅</div><div class="empty-title">No history yet</div><div class="empty-sub">Your advisor conversations will appear here.</div></div>'; return; }
  el.innerHTML = hist.slice().reverse().map(h=>`
    <div class="history-item" data-click="replayHistory" data-click-args="${argsAttr([h.id])}">
      <div class="hi-prompt">${escHtml(h.prompt)}</div>
      <div class="hi-meta"><span class="hi-topic">AI</span>${new Date(h.timestamp).toLocaleDateString()}</div>
    </div>`).join('');
}

function replayHistory(id) {
  const item = state.advisorHistory.find(h=>h.id===id);
  if (!item) return;
  setAdvTab('chat', document.querySelector('.ap-tab'));
  appendMsg('user', item.prompt);
  appendMsg('ai', item.response);
}

// ─── Full AI analysis ───────────────────────────────────────
async function runAiAnalysis() {
  if (!state.ui.advisorOpen) toggleAdvisor();
  setAdvTab('chat', document.querySelector('.ap-tab'));
  await sendAdvisorMessage_raw('Give me a complete financial analysis: cash flow health, top spending problems, budget performance, savings trajectory, and a prioritised 3-step action plan for the next 30 days.');
}
async function sendAdvisorMessage_raw(msg) {
  appendMsg('user', msg);
  appendMsg('ai', '', true);
  const result = await callClaude(msg);
  removeTyping();
  appendMsg('ai', result.text);
  state.advisorHistory.push({ id:uid(), prompt:msg, response:result.text, timestamp:new Date().toISOString() });
  Store.set('advisor_history', state.advisorHistory.slice(-100));
}

// ═══════════════════════════════════════════════════════════
// SUPABASE SYNC
// ═══════════════════════════════════════════════════════════
let _bannerDismissed = false;
function setSyncStatus(status, label) {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-label');
  dot.className = 'sync-dot ' + status;
  lbl.textContent = label;
  const banner = document.getElementById('sync-banner');
  if (banner) {
    if (status === 'error') banner.hidden = _bannerDismissed;
    else { banner.hidden = true; if (status === 'connected') _bannerDismissed = false; }
  }
  if (typeof renderAttention === 'function') renderAttention();
  if (typeof renderMore === 'function') renderMore();
}
function dismissSyncBanner() { _bannerDismissed = true; document.getElementById('sync-banner').hidden = true; }

async function connectSupabase() {
  await recheckCloudConfig();
}

// Syncs this device with the account. Resolves to { ok: true } or { ok: false, error }, never rejects.
// Calls made while a sync is running are folded into one follow-up run.
// `interactive` (a button press) opens the sign-in dialog when there is no session; background syncs stay quiet.
let _syncPromise = null, _syncAgain = false;
function syncNow({ interactive = false } = {}) {
  if (_syncPromise) { _syncAgain = true; return _syncPromise; }
  _syncPromise = (async () => {
    let result;
    do { _syncAgain = false; result = await syncOnce(interactive); } while (_syncAgain && result.ok);
    return result;
  })().finally(() => { _syncPromise = null; });
  return _syncPromise;
}

async function syncOnce(interactive) {
  const sb = getSbClient();
  if (!sb) { setSyncStatus('local', 'Local only'); return { ok: false, error: 'No cloud connection' }; }
  let session;
  try { ({ data: { session } } = await sb.auth.getSession()); } catch (e) { return syncFailed(e); }
  if (!session) {
    if (interactive) openModal('auth-modal');
    setSyncStatus('local', 'Sign in to sync');
    return { ok: false, error: 'Not signed in' };
  }
  if (activeProfile !== session.user.id) return { ok: false, error: 'Account changed' };
  setSyncStatus('syncing', 'Syncing…');
  try {
    const meta = SyncMeta.get();
    const firstSync = !meta.lastSyncAt;
    // First sync on this device: everything counts as pending, and competes with the server copy by timestamp.
    if (firstSync) {
      state.transactions = state.transactions.map(t => ({ ...t, dirty: true }));
      state.budgets = state.budgets.map(b => ({ ...b, dirty: true }));
      Store.set('transactions', state.transactions); Store.set('budgets', state.budgets);
    }
    const cursors = await pullFromSupabase(sb, meta);   // merge server changes first, so a push never overwrites them
    await pushToSupabase(sb, session.user.id);
    SyncMeta.set({ lastSyncAt: new Date().toISOString(), cursors });
    setSyncStatus('connected', `Synced ${new Date().toLocaleTimeString()}`);
    return { ok: true };
  } catch (e) {
    return syncFailed(e);
  }
}

function syncFailed(e) {
  const message = String(e?.message || e || 'unknown error');
  setSyncStatus('error', 'Sync failed: ' + message.slice(0, 30));
  console.error('Sync error:', e);
  return { ok: false, error: message };
}

// True when something on this device has not reached the account yet.
function hasUnsyncedChanges() {
  if (activeProfile === 'local') return false;
  const neverSynced = !SyncMeta.get().lastSyncAt && (state.transactions.length > 0 || state.budgets.length > 0);
  return neverSynced || state.tombstones.length > 0 || state.transactions.some(t => t.dirty) || state.budgets.some(b => b.dirty);
}

// Sends deletes first (so a budget can be recreated for the same category), then only the rows still pending.
// The server's updated_at for each pushed row is kept as syncedAt, so its echo is recognised on the next pull.
async function pushToSupabase(sb, userId) {
  for (const table of ['transactions', 'budgets']) {
    for (const tomb of state.tombstones.filter(t => t.table === table)) {
      const { error } = await sb.from(table).update({ deleted_at: tomb.deletedAt }).eq('id', tomb.id);
      if (error) throw error;
      state.tombstones = state.tombstones.filter(t => !(t.table === table && t.id === tomb.id));
      Store.set('tombstones', state.tombstones);
    }
  }
  const pushRows = async (table, items, toRow) => {
    const confirmed = new Map(), stamps = new Map(items.map(r => [r.id, r.updatedAt || r.createdAt || '']));
    for (let i = 0; i < items.length; i += 200) {
      const { data, error } = await sb.from(table).upsert(items.slice(i, i + 200).map(toRow), { onConflict: 'user_id,id' }).select('id,updated_at');
      if (error) throw error;
      for (const row of data || []) confirmed.set(row.id, { stamp: stamps.get(row.id), syncedAt: row.updated_at });
    }
    return confirmed;
  };
  const changedTx = pendingRecords(state.transactions, false);
  if (changedTx.length > 0) {
    const toRow = t => ({
      id: t.id, user_id: userId,
      description: t.description, amount: t.amount,
      type: t.type, category: t.category,
      date: t.date, notes: t.notes||null,
      currency: t.currency||'KES', amount_kes: txAmountKes(t),
      external_ref: t.externalRef||null, import_batch: t.importBatch||null,
      source: t.source||'manual', created_at: t.createdAt||new Date().toISOString(),
      deleted_at: null
    });
    state.transactions = markSynced(state.transactions, await pushRows('transactions', changedTx, toRow));
    Store.set('transactions', state.transactions);
  }
  const changedBudgets = pendingRecords(state.budgets, false);
  if (changedBudgets.length > 0) {
    const toRow = b => ({ id: b.id, user_id: userId, category: b.category, monthly_limit: b.limit, period: b.period||'monthly', deleted_at: null });
    state.budgets = markSynced(state.budgets, await pushRows('budgets', changedBudgets, toRow));
    Store.set('budgets', state.budgets);
  }
  if (state.advisorHistory.length > 0) {
    const ahRows = state.advisorHistory.map(h => ({ id: h.id, user_id: userId, prompt: h.prompt, response: h.response, created_at: h.timestamp }));
    const { error } = await sb.from('advisor_history').upsert(ahRows, { onConflict: 'user_id,id' });
    if (error && error.code !== '42P01') throw error;
  }
}

// Reads every page of rows changed since the saved cursor (Supabase returns at most 1000 rows per request).
async function fetchChanged(sb, table, cursor) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = sb.from(table).select('*').order('updated_at', { ascending: true }).order('id', { ascending: true }).range(from, from + 999);
    if (cursor) query = query.gte('updated_at', cursor);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
const latestTime = (rows, fallback) => rows.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), fallback || '') || null;

// Applies server changes (edits and deletes) using the rules in sync.js. Returns the new pull cursors.
async function pullFromSupabase(sb, meta) {
  const cursors = { ...(meta.cursors || {}) };
  const txRows = await fetchChanged(sb, 'transactions', cursors.transactions);
  const budgetRows = await fetchChanged(sb, 'budgets', cursors.budgets);
  const tombsFor = table => state.tombstones.filter(t => t.table === table);

  const txMerge = mergeRemote(state.transactions, txRows.map(r => ({
    id: r.id, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    record: r.deleted_at ? null : normalizeTx({
      id: r.id, description: r.description, amount: r.amount,
      type: r.type, category: r.category, date: r.date, currency: r.currency, amountKes: r.amount_kes,
      notes: r.notes||'', source: r.source||'synced', createdAt: r.created_at, updatedAt: r.updated_at,
      externalRef: r.external_ref || undefined, importBatch: r.import_batch || undefined,
    }),
  })), tombsFor('transactions'), { table: 'transactions' });

  const bMerge = mergeRemote(state.budgets, budgetRows.map(r => ({
    id: r.id, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    record: r.deleted_at ? null : normalizeBudget({ id: r.id, category: r.category, limit: r.monthly_limit, updatedAt: r.updated_at }),
  })), tombsFor('budgets'), { table: 'budgets', uniqueKey: 'category' });

  state.transactions = txMerge.records;
  state.budgets = bMerge.records;
  state.tombstones = [...txMerge.tombstones, ...bMerge.tombstones];
  Store.set('transactions', state.transactions); Store.set('budgets', state.budgets); Store.set('tombstones', state.tombstones);
  if (txMerge.changed + bMerge.changed > 0) rerenderCurrentPage();
  cursors.transactions = latestTime(txRows, cursors.transactions);
  cursors.budgets = latestTime(budgetRows, cursors.budgets);
  return cursors;
}

async function syncAdvisorHistory() {
  const sb = getSbClient();
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const last = state.advisorHistory.slice(-1)[0];
  if (!last) return;
  await sb.from('advisor_history').upsert([{ id:last.id, user_id:session.user.id, prompt:last.prompt, response:last.response, created_at:last.timestamp }], { onConflict:'user_id,id' }).catch(()=>{});
}

// ═══════════════════════════════════════════════════════════
// RENDER ENGINE
// ═══════════════════════════════════════════════════════════
function renderAll() {
  renderDashboard();   // gamification moves to Analytics when that page is redesigned
}

// ─── Gamification ────────────────────────────────────────────
function calcSavingsStreak(){
  const now=new Date();
  let streak=0;
  for(let i=0;i<12;i++){
    const ms=monthKey(now,-i);
    if(state.transactions.some(t=>t.date?.startsWith(ms)&&t.type==='savings'&&t.amount>0))streak++;
    else break;
  }
  return streak;
}

function renderGamification(){
  const card=document.getElementById('gamification-card');
  if(!card)return;
  if(!state.transactions.length){card.style.display='none';return;}
  card.style.display='';
  const streak=calcSavingsStreak();
  const totalSaved=totalKes(state.transactions.filter(t=>t.type==='savings'));
  const now=new Date();
  const thisMs=monthKey(now);
  const prevMs=monthKey(now,-1);
  const thisExp=totalKes(state.transactions.filter(t=>t.date?.startsWith(thisMs)&&t.type==='expense'));
  const prevExp=totalKes(state.transactions.filter(t=>t.date?.startsWith(prevMs)&&t.type==='expense'));
  const spendDiff=prevExp>0?((thisExp-prevExp)/prevExp*100).toFixed(1):null;
  const badges=[
    {icon:'★',lbl:'First Step',desc:'Added a transaction',done:state.transactions.length>0},
    {icon:'↑',lbl:'Data Rich',desc:'Imported M-Pesa',done:state.transactions.some(t=>t.source==='import')},
    {icon:'◆',lbl:'Saver',desc:'KES 10k saved',done:totalSaved>=10000},
    {icon:'⟳',lbl:'Streak',desc:'3-month savings',done:streak>=3},
    {icon:'◫',lbl:'Planner',desc:'Budget created',done:state.budgets.length>0},
    {icon:'◈',lbl:'Builder',desc:'KES 100k saved',done:totalSaved>=100000},
  ];
  const earned=badges.filter(b=>b.done).length;
  const spendColor=spendDiff!==null?(parseFloat(spendDiff)>0?'var(--rose)':'var(--teal)'):'var(--ink3)';
  const spendArrow=spendDiff!==null?(parseFloat(spendDiff)>0?'↑ More':'↓ Less'):'—';
  card.innerHTML=`<div class="table-card">
    <div class="tt"><div class="tt-title">Milestones</div><div style="font-size:.75rem;color:var(--ink3);font-family:var(--fm)">${earned}/${badges.length} earned</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--border)">
      <div style="padding:14px 18px;border-right:1px solid var(--border)">
        <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;font-weight:600;color:var(--ink3);margin-bottom:6px">Savings Streak</div>
        <div style="font-family:var(--fm);font-size:1.8rem;font-weight:600;color:${streak>0?'var(--teal)':'var(--ink3)'};line-height:1">${streak}<span style="font-size:.75rem;font-weight:400;margin-left:4px">mo</span></div>
        <div style="font-size:.75rem;color:var(--ink3);margin-top:4px">${streak>=3?'Outstanding!':streak>=1?'Keep going!':'Start saving this month'}</div>
      </div>
      <div style="padding:14px 18px">
        <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;font-weight:600;color:var(--ink3);margin-bottom:6px">vs Last Month</div>
        <div style="font-family:var(--fm);font-size:1.8rem;font-weight:600;color:${spendColor};line-height:1">${spendDiff!==null?(parseFloat(spendDiff)>0?'+':'')+spendDiff+'%':'—'}</div>
        <div style="font-size:.75rem;color:var(--ink3);margin-top:4px">${spendDiff!==null?spendArrow+' than last month':'No prior data'}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:14px 18px">
      ${badges.map(b=>`<div style="text-align:center;padding:10px 4px;border-radius:8px;background:${b.done?'var(--bluelt)':'var(--surface2)'};border:1px solid ${b.done?'rgba(55,48,163,.2)':'var(--border)'};transition:all .2s" title="${b.desc}">
        <div style="font-size:1rem;margin-bottom:4px;opacity:${b.done?1:.3}">${b.icon}</div>
        <div style="font-size:.75rem;font-weight:700;color:${b.done?'var(--blue)':'var(--ink3)'};margin-bottom:1px;line-height:1.2">${b.lbl}</div>
        <div style="font-size:.75rem;color:var(--ink3);line-height:1.2">${b.desc}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

function _periodFilter(period) {
  const { from, to } = periodBounds(period);
  return t => t.date >= from && t.date <= to;
}

const _periodLabel = { week:'Last 7 days', month:'This month', '3m':'Last 3 months' };

function getStats(period = 'month') {
  return { ...periodStats(state.transactions, period, new Date(), exchangeRates()),
    label: _periodLabel[period] || 'This month' };
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD (Midnight Ledger). Every figure comes from calc.js and the saved records.
// ═══════════════════════════════════════════════════════════
const fmtKes = n => 'KES ' + Number(n).toLocaleString('en-KE', { maximumFractionDigits: 2 });
const fmtKesCompact = n => {
  const a = Math.abs(n);
  if (a >= 1e6) return `KES ${parseFloat((n / 1e6).toFixed(1))}M`;
  if (a >= 1e4) return `KES ${parseFloat((n / 1e3).toFixed(1))}k`;
  return fmtKes(n);
};
const axisLabel = n => n >= 1e6 ? `${parseFloat((n / 1e6).toFixed(2))}M` : n >= 1e3 ? `${parseFloat((n / 1e3).toFixed(2))}k` : String(n);
const nairobiFmt = (date, options) => new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', ...options }).format(date);
const monthLong = (offset = 0, now = new Date()) => nairobiFmt(new Date(`${monthKey(now, offset)}-01T12:00:00Z`), { month: 'long' });
const shortDate = iso => nairobiFmt(new Date(`${iso}T12:00:00Z`), { day: 'numeric', month: 'short' });
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const CAT_ICON = { food:'basket', transport:'car', utilities:'bolt', entertainment:'film', health:'heart', shopping:'bag', savings:'coin', income:'import', transfer:'swap', other:'dots' };

let _heroCounted = false;
function renderHero() {
  const now = new Date(), s = monthSummary(state.transactions, now, exchangeRates());
  const hasAny = state.transactions.length > 0;
  const netEl = document.getElementById('hero-net');
  const text = value => (value < 0 ? '-' : '') + fmtKes(Math.abs(value));
  netEl.classList.toggle('neg', s.net < 0);
  if (!_heroCounted && s.net !== 0 && !reducedMotion()) {
    _heroCounted = true;
    const start = performance.now(), end = Math.abs(s.net), sign = s.net < 0 ? -1 : 1;
    const tick = t => {
      const p = Math.min(1, (t - start) / 700), eased = 1 - (1 - p) ** 3;
      netEl.textContent = text(sign * Math.round(end * eased));
      if (p < 1) requestAnimationFrame(tick); else netEl.textContent = text(s.net);
    };
    requestAnimationFrame(tick);
  } else { _heroCounted = _heroCounted || s.net !== 0; netEl.textContent = text(s.net); }

  const delta = document.getElementById('hero-delta');
  if (hasAny && s.netChangePct !== null) {
    delta.hidden = false; delta.className = 'chip ' + (s.netChangePct >= 0 ? 'up' : 'down');
    delta.textContent = `${s.netChangePct >= 0 ? '+' : '-'}${Math.abs(s.netChangePct)}% vs ${monthLong(-1, now)}`;
  } else delta.hidden = true;

  const sub = document.getElementById('hero-sub'), split = document.getElementById('hero-split');
  if (!hasAny) {
    sub.textContent = 'Add your first transaction or import a statement to see your month.'; split.hidden = true; return;
  }
  sub.innerHTML = `<span><span class="k">Income</span><b>${fmtKes(s.income)}</b></span><span><span class="k">Spent</span><b>${fmtKes(s.expenses)}</b></span>`;
  if (s.income > 0 || s.expenses > 0) {
    split.hidden = false;
    const spent = s.income > 0 ? s.spentPct : 100;
    document.getElementById('split-spent').style.width = spent + '%';
    document.getElementById('split-kept').style.width = (100 - spent) + '%';
    document.getElementById('split-spent-lbl').textContent = s.income > 0 ? `Spent ${spent}%` : 'No income recorded this month';
    document.getElementById('split-kept-lbl').textContent = s.income > 0 ? (s.expenses > s.income ? 'Spent more than you earned' : `Kept ${100 - spent}%`) : '';
    document.getElementById('split-bar').setAttribute('aria-label', s.income > 0 ? `You spent ${spent}% of this month's income` : 'No income recorded this month');
  } else split.hidden = true;
}

// Things the person should look at, most useful first (at most three).
function attentionItems(now = new Date()) {
  const items = [], bounds = periodBounds('month', now);
  const over = state.budgets
    .map(b => ({ b, spent: totalKes(state.transactions, { type: 'expense', category: b.category, ...bounds }) }))
    .filter(x => x.spent > x.b.limit).sort((a, b) => (b.spent - b.b.limit) - (a.spent - a.b.limit));
  if (over.length === 1) {
    items.push({ kind: 'bad', icon: 'alert', html: `<b>${escHtml((CATS[over[0].b.category] || CATS.other).label)}</b> is <span class="over">${fmtKes(over[0].spent - over[0].b.limit)} over</span> budget`, label: 'View budget', action: 'goPage', args: ['budgets', null] });
  } else if (over.length > 1) {
    items.push({ kind: 'bad', icon: 'alert', html: `<b>${over.length} budgets</b> are over their limit`, label: 'View budgets', action: 'goPage', args: ['budgets', null] });
  }
  if (activeProfile !== 'local') {
    const n = state.tombstones.length + state.transactions.filter(t => t.dirty).length + state.budgets.filter(b => b.dirty).length;
    if (n > 0) items.push({ kind: 'warn', icon: 'sync', html: `${n} change${n === 1 ? " isn't" : "s aren't"} backed up yet`, label: 'Sync now', action: 'syncNow', args: [] });
  } else if (getSbClient() && state.transactions.length >= 5) {
    items.push({ kind: 'info', icon: 'info', html: 'Your records are only saved on this device', label: 'Sign in', action: 'openModal', args: ['auth-modal'] });
  }
  const lastImport = state.imports.map(i => i.date).sort().at(-1);
  if (lastImport && (now - new Date(lastImport)) / 864e5 > 30) {
    items.push({ kind: 'info', icon: 'import', html: `You haven't imported a statement since ${nairobiFmt(new Date(lastImport), { day: 'numeric', month: 'long' })}`, label: 'Import', action: 'goPage', args: ['mpesa', null] });
  }
  return items.slice(0, 3);
}
function renderAttention() {
  const card = document.getElementById('attention-card'); if (!card) return;
  const items = state.transactions.length || state.budgets.length ? attentionItems() : [];
  card.hidden = !items.length;
  document.getElementById('attention-count').textContent = items.length || '';
  document.getElementById('attention-list').innerHTML = items.map(item => `<li>
    <span class="att-ico ${item.kind}">${icon(item.icon)}</span>
    <span class="att-text">${item.html}</span>
    <button class="btn-secondary" data-click="${item.action}"${item.args.length ? ` data-click-args="${argsAttr(item.args)}"` : ''}>${item.label}</button></li>`).join('');
}

function renderBudgetStatus() {
  const el = document.getElementById('budget-status-bars'); if (!el) return;
  if (!state.budgets.length) {
    el.innerHTML = '<p class="empty-note">No budgets yet. Set a monthly limit for a category to see how much is left.</p><div class="bud-foot"><span></span><button class="btn-secondary" data-click="openAddBudget">Create budget</button></div>';
    return;
  }
  const now = new Date(), bounds = periodBounds('month', now), daysLeft = daysLeftInMonth(now);
  const rows = state.budgets.map(b => {
    const spent = totalKes(state.transactions, { type: 'expense', category: b.category, ...bounds });
    return { b, spent, pct: b.limit > 0 ? (spent / b.limit) * 100 : 0 };
  }).sort((a, b) => b.pct - a.pct);
  const shown = rows.slice(0, 3);
  el.innerHTML = shown.map(({ b, spent, pct }) => {
    const label = escHtml((CATS[b.category] || CATS.other).label), over = spent > b.limit, left = Math.max(b.limit - spent, 0);
    const tone = over ? 'bad' : pct >= 80 ? 'warn' : '';
    const perDay = left > 0 ? Math.round(left / daysLeft) : 0;
    const leftText = over ? `<b>${fmtKes(spent - b.limit)} over</b>` : `<b>${fmtKes(left)} left</b>${perDay > 0 ? ` · about ${fmtKes(perDay)} a day` : ''}`;
    const note = over ? `Exceeded by ${Math.round(((spent - b.limit) / b.limit) * 100)}%` : `${Math.round(pct)}% used of ${fmtKes(b.limit)}`;
    return `<div class="bud"><div class="bud-top"><span class="bud-name">${label}</span><span class="bud-left ${over ? 'over' : ''}">${leftText}</span></div>
      <div class="bud-track" role="progressbar" aria-label="${label} budget" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, Math.round(pct))}"><div class="bud-fill ${tone}${over ? ' pulse' : ''}" style="width:${Math.min(100, pct)}%"></div></div>
      <div class="bud-note ${over ? 'over' : ''}">${note}</div></div>`;
  }).join('');
  const top = rows.slice().sort((a, b) => b.b.limit - a.b.limit)[0];
  const lastSpent = totalKes(state.transactions, { type: 'expense', category: top.b.category, ...periodBounds('month', now, true) });
  el.insertAdjacentHTML('beforeend', `<div class="bud-foot"><span>${lastSpent > 0 ? `Last month you spent ${fmtKes(lastSpent)} on ${escHtml((CATS[top.b.category] || CATS.other).label)}.` : ''}</span><button class="link" data-click="goPage" data-click-args='["budgets",null]'>${rows.length > 3 ? `View all ${rows.length} budgets` : 'View all budgets'}</button></div>`);
}

// ─── Cash flow chart (canvas, with hover/keyboard tooltip and a text alternative) ───
let _chartPeriod = 'month', _chartSel = -1, _chartGeom = null, _chartAnim = 0;
const COLORS = { inc: '#34d399', exp: '#fb7185', grid: '#252e3b', text: '#a3aebd', sel: '#1a212c' };
function chartTitleFor(period, label) { return period === 'month' ? `${label} ${nairobiFmt(new Date(), { month: 'short' })}` : label; }

function drawMainChart(period = _chartPeriod, { animate = false } = {}) {
  _chartPeriod = period;
  const c = document.getElementById('main-canvas'); if (!c) return;
  const W = c.clientWidth, H = c.clientHeight; if (!W || !H) return;
  const series = chartSeries(state.transactions, period, new Date(), exchangeRates());
  const { labels, income, expenses } = series, n = labels.length;
  const hasData = [...income, ...expenses].some(v => v > 0);
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const { step, top } = niceScale(Math.max(...income, ...expenses, 0));
  ctx.font = '12px Inter, sans-serif';
  const pL = Math.ceil(ctx.measureText(`KES ${axisLabel(top)}`).width) + 20, pR = 8, pT = 14, pB = 30, cW = W - pL - pR, cH = H - pT - pB, gap = cW / n;
  _chartGeom = { pL, gap, n, pT, cH, top, W, H, income, expenses, labels };
  const bw = Math.min(gap * 0.28, 30);
  cancelAnimationFrame(_chartAnim);
  const paint = t => {
    ctx.clearRect(0, 0, W, H);
    ctx.font = '12px Inter, sans-serif'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 3; i++) {
      const y = pT + cH * (1 - i / 3);
      ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(W - pR, y); ctx.stroke();
      ctx.fillStyle = COLORS.text; ctx.textAlign = 'right'; ctx.fillText(hasData ? `KES ${axisLabel(step * i)}` : (i === 0 ? 'KES 0' : ''), pL - 10, y);
    }
    if (!hasData) { ctx.fillStyle = COLORS.text; ctx.textAlign = 'center'; ctx.fillText('No activity yet. Add transactions to see your cash flow.', pL + cW / 2, pT + cH / 2); return; }
    labels.forEach((label, i) => {
      const cx = pL + i * gap + gap / 2, sel = i === _chartSel;
      if (sel) { ctx.fillStyle = COLORS.sel; ctx.beginPath(); ctx.roundRect(cx - gap / 2 + 4, pT, gap - 8, cH, 12); ctx.fill(); }
      const p = animate ? Math.min(1, Math.max(0, t * 1.5 - (i * 0.5) / n)) : 1, e = 1 - (1 - p) ** 3;
      [[income[i], cx - bw - 2, COLORS.inc], [expenses[i], cx + 2, COLORS.exp]].forEach(([value, x, color]) => {
        const h = (value / top) * cH * e; if (h <= 0) return;
        ctx.globalAlpha = _chartSel === -1 || sel ? 1 : 0.55; ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(x, pT + cH - h, bw, h, [4, 4, 0, 0]); ctx.fill(); ctx.globalAlpha = 1;
      });
      ctx.fillStyle = sel ? '#f4f6f8' : COLORS.text; ctx.font = `${sel ? 600 : 400} 12px Inter, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(label, cx, H - 12);
    });
  };
  if (animate && hasData && !reducedMotion()) {
    const start = performance.now();
    const frame = now => { const t = Math.min(1, (now - start) / 700); paint(t); if (t < 1) _chartAnim = requestAnimationFrame(frame); };
    _chartAnim = requestAnimationFrame(frame);
  } else paint(1);
  updateChartText(series, period, hasData);
}

function updateChartText(series, period, hasData) {
  const { labels, income, expenses } = series, summary = document.getElementById('cf-summary'), table = document.getElementById('cf-table');
  const totalExp = expenses.reduce((a, b) => a + b, 0);
  if (totalExp > 0) {
    const at = labels[expenses.indexOf(Math.max(...expenses))];
    summary.textContent = `Expenses were highest ${period === 'week' ? 'on' : period === '3m' ? 'in' : 'between'} ${chartTitleFor(period, at)}.`;
  } else summary.textContent = hasData ? 'No expenses recorded in this period.' : '';
  table.innerHTML = '<caption>Income and expenses by period</caption><thead><tr><th scope="col">Period</th><th scope="col">Income</th><th scope="col">Expenses</th></tr></thead><tbody>' +
    labels.map((l, i) => `<tr><th scope="row">${escHtml(chartTitleFor(period, l))}</th><td>${fmtKes(income[i])}</td><td>${fmtKes(expenses[i])}</td></tr>`).join('') + '</tbody>';
}

function showChartTip(index) {
  const tip = document.getElementById('chart-tip'), g = _chartGeom;
  if (!g || index < 0 || index >= g.n) { tip.hidden = true; if (_chartSel !== -1) { _chartSel = -1; drawMainChart(_chartPeriod); } return; }
  _chartSel = index; drawMainChart(_chartPeriod);
  const cx = g.pL + index * g.gap + g.gap / 2, tall = Math.max(g.income[index], g.expenses[index]);
  tip.innerHTML = `<b>${escHtml(chartTitleFor(_chartPeriod, g.labels[index]))}</b><span class="i">Income ${fmtKes(g.income[index])}</span><br><span class="e">Expenses ${fmtKes(g.expenses[index])}</span>`;
  tip.hidden = false;
  tip.style.left = Math.min(Math.max(cx, 90), g.W - 90) + 'px';
  tip.style.top = Math.max(g.pT + g.cH * (1 - tall / g.top) - 10, 70) + 'px';
}
function wireChart() {
  const c = document.getElementById('main-canvas'); if (!c) return;
  const indexAt = e => { const g = _chartGeom; if (!g) return -1; const i = Math.floor((e.offsetX - g.pL) / g.gap); return i >= 0 && i < g.n ? i : -1; };
  c.addEventListener('mousemove', e => { const i = indexAt(e); if (i !== _chartSel) showChartTip(i); });
  c.addEventListener('mouseleave', () => showChartTip(-1));
  c.addEventListener('click', e => { const i = indexAt(e); showChartTip(i === _chartSel ? -1 : i); });
  c.addEventListener('blur', () => showChartTip(-1));
  c.addEventListener('keydown', e => {
    const g = _chartGeom; if (!g || !['ArrowLeft', 'ArrowRight', 'Escape'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'Escape') return showChartTip(-1);
    const next = _chartSel === -1 ? (e.key === 'ArrowRight' ? 0 : g.n - 1) : Math.min(g.n - 1, Math.max(0, _chartSel + (e.key === 'ArrowRight' ? 1 : -1)));
    showChartTip(next);
  });
}
function setChartPeriod(btn, p) {
  document.querySelectorAll('.seg .pb').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
  btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true');
  _chartSel = -1; document.getElementById('chart-tip').hidden = true;
  drawMainChart(p, { animate: true });
}

// ─── Where your money went (SVG donut) ───
function renderDonut() {
  const host = document.getElementById('donut'), legend = document.getElementById('donut-legend'); if (!host) return;
  const now = new Date(), bounds = periodBounds('month', now);
  document.getElementById('donut-period-sub').textContent = `${monthLong(0, now)} ${monthKey(now).slice(0, 4)}`;
  const totals = categoryTotals(state.transactions, { type: 'expense', ...bounds }, exchangeRates());
  const shares = categoryShares(totals, 5), total = Object.values(totals).reduce((a, b) => a + b, 0);
  const R = 70, C = 2 * Math.PI * R, GAP = shares.length > 1 ? 3 : 0;
  let offset = 0;
  const arcs = shares.map(s => {
    const len = Math.max((s.total / total) * C - GAP, 1), arc = `<circle class="seg-arc" cx="88" cy="88" r="${R}" stroke="${(CATS[s.key] || CATS.other).color}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"/>`;
    offset += (s.total / total) * C; return arc;
  }).join('');
  host.innerHTML = `<svg viewBox="0 0 176 176" aria-hidden="true"><circle class="track" cx="88" cy="88" r="${R}"/>${arcs}</svg><div class="donut-center"><small>${total > 0 ? 'Total spent' : 'Spent'}</small><b>${total > 0 ? fmtKesCompact(total) : 'KES 0'}</b></div>`;
  host.setAttribute('aria-label', total > 0 ? 'Spending this month: ' + shares.map(s => `${(CATS[s.key] || CATS.other).label} ${s.pct}%`).join(', ') : 'No spending recorded this month');
  legend.innerHTML = total > 0 ? shares.map(s => {
    const cat = CATS[s.key] || CATS.other;
    return `<li><span class="sw" style="background:${cat.color}"></span><span class="nm">${escHtml(cat.label)}</span><span class="pc">${s.pct}%</span><span class="am">${fmtKes(s.total)}</span></li>`;
  }).join('') : '<li class="empty-note">No spending recorded this month.</li>';
}

function renderRecentTx() {
  const el = document.getElementById('recent-tx'); if (!el) return;
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);
  if (!recent.length) { el.innerHTML = '<li class="empty-note">No transactions yet.</li>'; return; }
  el.innerHTML = recent.map(t => {
    const cat = CATS[t.category] || CATS.other, source = t.source === 'import' ? 'Imported' : 'Manual';
    const cls = t.type === 'income' ? 'in' : t.type === 'savings' ? 'sav' : 'out', sign = t.type === 'income' ? '+' : '-';
    const amount = `${sign}${fmtKes(txAmountKes(t))}`, spoken = `${fmtKes(txAmountKes(t))} ${t.type === 'income' ? 'received' : 'spent'}`;
    return `<li><button class="rtx" data-click="openTxDetail" data-click-args="${argsAttr([t.id])}" aria-haspopup="dialog" aria-label="${escHtml(`${t.description}, ${cat.label}, ${shortDate(t.date)}, ${source}, ${spoken}. Open details.`)}">
      <span class="rtx-ico" style="color:${cat.color}">${icon(CAT_ICON[t.category] || 'dots')}</span>
      <span><span class="rtx-name" style="display:block">${escHtml(t.description)}</span><span class="rtx-meta" style="display:block">${escHtml(cat.label)} · ${shortDate(t.date)} · ${source}</span></span>
      <span class="rtx-amt ${cls}">${amount}</span></button></li>`;
  }).join('');
}

function renderDashboard() {
  const empty = state.transactions.length === 0;
  document.getElementById('getstarted').hidden = !empty;
  document.getElementById('dash-grid').hidden = empty;
  renderHero(); renderAttention();
  if (!empty) { drawMainChart(_chartPeriod); renderDonut(); renderBudgetStatus(); renderRecentTx(); }
}

// ─── Transaction table renderer ────────────────────────────
function exchangeRates() {
  return Object.fromEntries(Object.entries(DEFAULT_RATES).map(([currency, fallback]) => {
    const value = Number(CFG.get('rate_' + currency));
    return [currency, Number.isFinite(value) && value > 0 ? value : fallback];
  }));
}
function txAmountKes(tx) { return amountKes(tx, exchangeRates()); }
function totalKes(transactions, options) { return sumKes(transactions, options, exchangeRates()); }
function txRow(tx,actions=true){
  const c=CATS[tx.category]||CATS.other;
  const isPos=tx.type==='income'||tx.type==='savings';
  const amtClass=isPos?'pos':'neg';
  const amtSign=isPos?'+':'−';
  const srcLabel=tx.source==='ai'?'AI':tx.source==='import'?'Import':'Manual';
  const cur=tx.currency&&tx.currency!=='KES'?tx.currency:'KES';
  const amtDisplay=`${amtSign}KES ${txAmountKes(tx).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}${cur==='KES'?'':`<span class="fx-note">${cur} ${tx.amount.toLocaleString()}</span>`}`;
  return `<tr>
    <td><div style="display:flex;align-items:center;gap:10px">
      <div class="td-ico" style="background:${c.bg};color:${c.color}">${icon(tx.type==='income'?'export':'ledger')}</div>
      <div><div class="td-main">${escHtml(tx.description)}</div><div class="td-sub">${escHtml(tx.date)}</div></div>
    </div></td>
    <td><div class="cat-pill" style="background:${c.bg};color:${c.color}">${c.label}</div><div class="source-note">${srcLabel}</div></td>
    <td><div class="td-mono ${amtClass}">${amtDisplay}</div></td>
    ${actions?`<td><div class="row-acts">
      <button class="ra" data-click="openEditTx" data-click-args="${argsAttr([tx.id])}" title="Edit" aria-label="Edit ${escHtml(tx.description)}">${icon('edit')}</button>
      <button class="ra del" data-click="confirmDel" data-click-args="${argsAttr(['tx',tx.id])}" title="Delete" aria-label="Delete ${escHtml(tx.description)}">${icon('delete')}</button>
    </div></td>`:''}
  </tr>`;
}

// ═══════════════════════════════════════════════════════════
// TRANSACTIONS PAGE: filters, list (table on desktop, grouped list on phones), row menu
// ═══════════════════════════════════════════════════════════
const isPhone = () => matchMedia('(max-width:768px)').matches;
const dayHeading = (group, today) => group.rel === 'today' ? ['Today', nairobiFmt(new Date(`${group.date}T12:00:00Z`), { day: 'numeric', month: 'short', year: 'numeric' })]
  : group.rel === 'yesterday' ? ['Yesterday', nairobiFmt(new Date(`${group.date}T12:00:00Z`), { day: 'numeric', month: 'short', year: 'numeric' })]
  : [shortDate(group.date), nairobiFmt(new Date(`${group.date}T12:00:00Z`), { weekday: 'long' })];
const txFilters = () => ({ type: state.ui.txFilter, query: state.ui.txSearch, categories: state.ui.txCats, from: state.ui.txFrom, to: state.ui.txTo });
const txFiltersActive = () => state.ui.txFilter !== 'all' || Boolean(state.ui.txSearch) || countFilters(txFilters()) > 0;

function pageList(current, total) {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, 2, 3, total, current - 1, current, current + 1].filter(n => n >= 1 && n <= total));
  const sorted = [...pages].sort((a, b) => a - b), out = [];
  sorted.forEach((n, i) => { if (i && n - sorted[i - 1] > 1) out.push('…'); out.push(n); });
  return out;
}
function txTypeAmount(tx) {
  const cls = tx.type === 'income' ? 'in' : tx.type === 'savings' ? 'sav' : tx.type === 'transfer' ? 'neu' : 'out';
  const sign = tx.type === 'income' ? '+' : '-', foreign = tx.currency && tx.currency !== 'KES';
  return `<span class="rtx-amt ${cls}">${sign}${fmtKes(txAmountKes(tx))}</span>${foreign ? `<small class="fx">${escHtml(tx.currency)} ${Number(tx.amount).toLocaleString('en-KE')}</small>` : ''}`;
}

function renderTxPage() {
  const all = state.transactions.length, rows = filterTransactions(state.transactions, txFilters()), active = txFiltersActive();
  document.getElementById('tx-count-sub').textContent = active ? `${rows.length} of ${all} shown` : `${all} transaction${all === 1 ? '' : 's'}`;
  document.querySelectorAll('#tx-filter-row .pb').forEach(b => {
    const on = readArgs(b, 'click')[0] === state.ui.txFilter; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
  });
  const n = countFilters(txFilters()), badge = document.getElementById('tx-filter-badge');
  badge.hidden = !n; badge.textContent = n || '';
  const pills = [...state.ui.txCats.map(key => `<button type="button" class="pill" data-click="txRemoveCat" data-click-args="${argsAttr([key])}" aria-label="Remove ${escHtml((CATS[key] || CATS.other).label)} filter">${escHtml((CATS[key] || CATS.other).label)}<span data-icon="close" aria-hidden="true"></span></button>`),
    ...(state.ui.txFrom || state.ui.txTo ? [`<button type="button" class="pill" data-click="txRemoveDates" aria-label="Remove date filter">${escHtml(dateRangeLabel(state.ui.txFrom, state.ui.txTo))}<span data-icon="close" aria-hidden="true"></span></button>`] : [])];
  const applied = document.getElementById('tx-applied');
  applied.hidden = !pills.length;
  applied.innerHTML = pills.length ? `<span class="muted">Active filters</span>${pills.join('')}<button type="button" class="link" data-click="txClearAll">Clear all</button>` : '';
  renderIcons(applied);

  const el = document.getElementById('full-tx-table'), foot = document.getElementById('tx-foot');
  if (!all) {
    foot.hidden = true;
    el.innerHTML = `<div class="tx-empty"><span class="empty-ico">${icon('ledger')}</span><h3>No transactions yet</h3><p class="muted">Add one yourself or import an M-Pesa statement. Records are saved on this device.</p>
      <div class="imp-actions"><button class="btn-primary" data-click="openAddTx"><span data-icon="plus" aria-hidden="true"></span>Add your first transaction</button><button class="btn-secondary" data-click="goPage" data-click-args='["mpesa",null]'>Import M-Pesa statement</button></div></div>`;
    renderIcons(el); return;
  }
  if (!rows.length) {
    foot.hidden = true;
    el.innerHTML = `<div class="tx-empty"><span class="empty-ico">${icon('search')}</span><h3>No transactions match your search</h3><p class="muted">Try a different word or clear your filters.</p>
      <button class="btn-secondary" data-click="txClearAll">Clear search and filters</button></div>`;
    return;
  }
  foot.hidden = false;
  if (isPhone()) {
    const shown = rows.slice(0, state.ui.txLimit), today = nairobiDate();
    el.innerHTML = groupByDate(shown, today).map(group => {
      const [left, right] = dayHeading(group, today);
      return `<section class="m-day"><header><h3>${escHtml(left)}</h3><span>${escHtml(right)}</span></header><ul class="m-rows">${group.rows.map(txPhoneRow).join('')}</ul></section>`;
    }).join('') + (rows.length > shown.length ? '<button class="btn-secondary load-more" data-click="txLoadMore">Load more</button>' : '');
    document.getElementById('tx-pg-info').textContent = `Showing ${shown.length} of ${rows.length} transactions`;
    document.getElementById('tx-pag').innerHTML = '';
  } else {
    const { txPage, perPage } = state.ui, total = rows.length, pages = Math.max(1, Math.ceil(total / perPage));
    if (txPage > pages) state.ui.txPage = pages;
    const start = (state.ui.txPage - 1) * perPage, end = Math.min(start + perPage, total);
    el.innerHTML = `<div class="txt-wrap"><table class="txt"><thead><tr><th scope="col">Description</th><th scope="col">Date</th><th scope="col">Source</th><th scope="col" class="r">Amount</th><th scope="col" class="r"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows.slice(start, end).map(txDesktopRow).join('')}</tbody></table></div>`;
    document.getElementById('tx-pg-info').textContent = `Showing ${start + 1}-${end} of ${total}`;
    document.getElementById('tx-pag').innerHTML = pages < 2 ? '' :
      `<button class="pg" data-click="setTxPage" data-click-args='[${state.ui.txPage - 1}]' ${state.ui.txPage <= 1 ? 'disabled' : ''}>Previous</button>${pageList(state.ui.txPage, pages).map(p => p === '…' ? '<span class="pg gap">…</span>' : `<button class="pg ${p === state.ui.txPage ? 'on' : ''}" aria-label="Page ${p}"${p === state.ui.txPage ? ' aria-current="page"' : ''} data-click="setTxPage" data-click-args='[${p}]'>${p}</button>`).join('')}<button class="pg" data-click="setTxPage" data-click-args='[${state.ui.txPage + 1}]' ${state.ui.txPage >= pages ? 'disabled' : ''}>Next</button>`;
  }
}
function dateRangeLabel(from, to) {
  const f = d => nairobiFmt(new Date(`${d}T12:00:00Z`), { day: 'numeric', month: 'short' });
  return from && to ? `${f(from)} - ${f(to)}` : from ? `From ${f(from)}` : `Until ${f(to)}`;
}
function txDesktopRow(tx) {
  const cat = CATS[tx.category] || CATS.other, source = tx.source === 'import' ? 'Imported' : 'Manual', id = argsAttr([tx.id]);
  return `<tr data-click="openTxDetail" data-click-args="${id}">
    <td><div class="tx-name"><span class="rtx-ico" style="color:${cat.color}">${icon(CAT_ICON[tx.category] || 'dots')}</span><div><button type="button" class="tx-open" data-click="openTxDetail" data-click-args="${id}" aria-haspopup="dialog">${escHtml(tx.description)}</button><span class="cat-chip" style="background:${cat.bg};color:${cat.color}">${escHtml(cat.label)}</span></div></div></td>
    <td class="nw">${escHtml(nairobiFmt(new Date(`${tx.date}T12:00:00Z`), { day: 'numeric', month: 'short', year: 'numeric' }))}</td>
    <td><span class="src ${tx.source === 'import' ? 'imp' : ''}"><i></i>${source}</span></td>
    <td class="r nw">${txTypeAmount(tx)}</td>
    <td class="r"><button type="button" class="ib dots" aria-label="Actions for ${escHtml(tx.description)}" aria-haspopup="menu" aria-expanded="false" data-click="openTxMenu" data-click-args="${argsAttr([tx.id, '$el'])}"><span data-icon="dots" aria-hidden="true"></span></button></td></tr>`;
}
function txPhoneRow(tx) {
  const cat = CATS[tx.category] || CATS.other, source = tx.source === 'import' ? 'Imported' : 'Manual';
  return `<li><button class="rtx" data-click="openTxDetail" data-click-args="${argsAttr([tx.id])}" aria-haspopup="dialog"
    aria-label="${escHtml(`${tx.description}, ${cat.label}, ${shortDate(tx.date)}, ${source}, ${fmtKes(txAmountKes(tx))}. Open details.`)}">
    <span class="rtx-ico" style="color:${cat.color}">${icon(CAT_ICON[tx.category] || 'dots')}</span>
    <span><span class="rtx-name" style="display:block">${escHtml(tx.description)}</span><span class="rtx-meta" style="display:block">${escHtml(cat.label)} · ${source}</span></span>
    <span class="rtx-amt-wrap">${txTypeAmount(tx)}</span></button></li>`;
}

function setTxFilter(f, btn) { state.ui.txFilter = f; state.ui.txPage = 1; state.ui.txLimit = 20; renderTxPage(); }
function searchTx(q) { state.ui.txSearch = q; state.ui.txPage = 1; state.ui.txLimit = 20; renderTxPage(); }
function searchGlobalTx(q) {
  if (!document.getElementById('page-transactions').classList.contains('on')) goPage('transactions', null);
  document.getElementById('tx-search').value = q;
  searchTx(q);
}
function setTxPage(p) { state.ui.txPage = Math.max(1, p); renderTxPage(); document.getElementById('content').scrollTop = 0; }
function txLoadMore() { state.ui.txLimit += 20; renderTxPage(); }
function resetTxFilters() {
  Object.assign(state.ui, { txFilter: 'all', txSearch: '', txCats: [], txFrom: '', txTo: '', txPage: 1, txLimit: 20 });
  const search = document.getElementById('tx-search'); if (search) search.value = '';
}
function txClearAll() { resetTxFilters(); renderTxPage(); }
function txRemoveCat(key) { state.ui.txCats = state.ui.txCats.filter(k => k !== key); state.ui.txPage = 1; renderTxPage(); }
function txRemoveDates() { state.ui.txFrom = ''; state.ui.txTo = ''; state.ui.txPage = 1; renderTxPage(); }

// Filters panel (side panel on desktop, bottom sheet on phones)
function openTxFilters() {
  document.getElementById('tf-from').value = state.ui.txFrom; document.getElementById('tf-to').value = state.ui.txTo;
  document.getElementById('tf-cats').innerHTML = CAT_KEYS.map(key => {
    const cat = CATS[key];
    return `<label class="cat-check"><input type="checkbox" value="${key}"${state.ui.txCats.includes(key) ? ' checked' : ''}><span class="cc-ico" style="color:${cat.color}">${icon(CAT_ICON[key])}</span><span>${escHtml(cat.label)}</span></label>`;
  }).join('');
  openModal('tx-filters');
}
function txQuickRange(name) {
  const range = quickRange(name); document.getElementById('tf-from').value = range.from; document.getElementById('tf-to').value = range.to;
}
function txResetFilters() {
  document.getElementById('tf-from').value = ''; document.getElementById('tf-to').value = '';
  document.querySelectorAll('#tf-cats input').forEach(box => { box.checked = false; });
}
function txApplyFilters() {
  const from = document.getElementById('tf-from').value, to = document.getElementById('tf-to').value;
  if (from && to && from > to) { showToast('The start date is after the end date.', 'error'); return; }
  state.ui.txFrom = from; state.ui.txTo = to;
  state.ui.txCats = [...document.querySelectorAll('#tf-cats input:checked')].map(box => box.value);
  state.ui.txPage = 1; state.ui.txLimit = 20;
  closeModal('tx-filters'); renderTxPage();
}

// A small floating menu (Edit, Delete) used by transaction rows and budget cards on desktop.
let _menuFor = null;
function closeRowMenu() {
  const menu = document.getElementById('row-menu'); if (menu.hidden) return;
  menu.hidden = true; _menuFor?.setAttribute('aria-expanded', 'false'); _menuFor = null;
}
function showRowMenu(button, items) {
  if (_menuFor === button) { closeRowMenu(); return; }
  closeRowMenu();
  const menu = document.getElementById('row-menu');
  menu.innerHTML = items.map((item, i) => `<button type="button" role="menuitem" class="${item.danger ? 'danger' : ''}" data-menu="${i}">${icon(item.icon)}${escHtml(item.label)}</button>`).join('');
  menu._items = items; menu.hidden = false; button.setAttribute('aria-expanded', 'true'); _menuFor = button;
  const r = button.getBoundingClientRect(), h = menu.offsetHeight, w = menu.offsetWidth;
  menu.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
  menu.style.top = (r.bottom + h + 12 > innerHeight ? r.top - h - 4 : r.bottom + 4) + 'px';
  menu.querySelector('button')?.focus();
}
function wireRowMenu() {
  const menu = document.getElementById('row-menu');
  menu.addEventListener('click', e => {
    const item = e.target.closest('[data-menu]'); if (!item) return;
    const run = menu._items[Number(item.dataset.menu)].run, opener = _menuFor; closeRowMenu(); run?.();
    if (!document.querySelector('.modal-overlay.open')) opener?.focus();
  });
  menu.addEventListener('keydown', e => {
    const buttons = [...menu.querySelectorAll('button')], at = buttons.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(at + 1) % buttons.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(at - 1 + buttons.length) % buttons.length].focus(); }
    if (e.key === 'Escape') { e.preventDefault(); const opener = _menuFor; closeRowMenu(); opener?.focus(); }
    if (e.key === 'Tab') closeRowMenu();
  });
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target) && !e.target.closest('.dots')) closeRowMenu(); });
  window.addEventListener('resize', closeRowMenu);
  document.getElementById('content').addEventListener('scroll', closeRowMenu, { passive: true });
}
function openTxMenu(id, button) {
  const tx = state.transactions.find(t => t.id === id); if (!tx) return;
  showRowMenu(button, [{ label: 'Edit', icon: 'edit', run: () => openEditTx(id) }, { label: 'Delete', icon: 'delete', danger: true, run: () => confirmDel('tx', id) }]);
}

// ═══════════════════════════════════════════════════════════
// BUDGETS PAGE
// ═══════════════════════════════════════════════════════════
function renderBudgetsPage() {
  const now = new Date(), rows = budgetRows(state.budgets, state.transactions, now, exchangeRates()), summary = budgetSummary(rows, now);
  document.getElementById('bud-month').textContent = monthLong(0, now);
  const line = document.getElementById('budget-summary');
  line.hidden = !rows.length;
  if (rows.length) line.innerHTML = `<b>${summary.over ? `${fmtKes(-summary.left)} over` : `${fmtKes(summary.left)} left`}</b> across ${summary.count} budget${summary.count === 1 ? '' : 's'}<span class="dotsep">·</span><b>${summary.pctUsed}%</b> used${summary.perDay > 0 ? `<span class="dotsep">·</span>about <b>${fmtKes(summary.perDay)}</b> a day` : ''}`;
  const grid = document.getElementById('budget-grid');
  if (!rows.length) {
    grid.innerHTML = `<div class="card tx-empty"><span class="empty-ico">${icon('wallet')}</span><h3>No budgets yet</h3><p class="muted">Set a monthly limit for a category to see how much is left.</p><button class="btn-primary" data-click="openAddBudget"><span data-icon="plus" aria-hidden="true"></span>Create budget</button></div>`;
    renderIcons(grid); return;
  }
  const sorted = rows.slice().sort((a, b) => b.pct - a.pct);
  grid.innerHTML = sorted.map(row => {
    const b = row.budget, cat = CATS[b.category] || CATS.other, label = escHtml(cat.label), id = argsAttr([b.id]);
    const big = row.over ? `<b>${fmtKes(row.spent - b.limit)}</b> over` : `<b>${fmtKes(row.left)}</b> left`;
    const sub = row.over ? `Limit exceeded by ${row.overPct}%` : row.perDay > 0 ? `about ${fmtKes(row.perDay)} a day` : 'No days left to spend it';
    const chip = row.tone === 'warn' ? `${Math.round(row.pct)}% · ${Math.max(0, 100 - Math.round(row.pct))}% remaining` : `${Math.round(row.pct)}%`;
    return `<article class="bcard ${row.over ? 'is-over' : ''}" aria-label="${label} budget">
      <header><span class="rtx-ico" style="color:${cat.color}">${icon(CAT_ICON[b.category] || 'dots')}</span><div class="bc-id"><h3>${label}</h3><span class="muted">Monthly limit ${fmtKes(b.limit)}</span></div>
        <button type="button" class="ib dots" aria-label="Actions for ${label} budget" aria-haspopup="menu" aria-expanded="false" data-click="openBudgetMenu" data-click-args="${argsAttr([b.id, '$el'])}"><span data-icon="dots" aria-hidden="true"></span></button></header>
      <div class="bc-big ${row.over ? 'over' : ''}">${big}</div>
      <div class="bc-sub ${row.over ? 'over' : ''}">${sub}</div>
      <div class="bud-track" role="progressbar" aria-label="${label} budget used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, Math.round(row.pct))}"><div class="bud-fill ${row.tone === 'ok' ? '' : row.tone}" style="width:${Math.min(100, row.pct)}%"></div></div>
      <footer><span>Spent ${fmtKes(row.spent)} of ${fmtKes(b.limit)}</span><span class="chip ${row.tone}">${chip}</span></footer>
      ${row.over ? `<div class="bc-acts"><button type="button" class="btn-secondary" data-click="openRaiseLimit" data-click-args="${id}">Raise limit</button><button type="button" class="btn-secondary" data-click="viewBudgetTx" data-click-args="${argsAttr([b.category])}">View transactions</button></div>` : ''}</article>`;
  }).join('') + (categoryChoices(state.budgets).some(c => !c.taken) ? `<button type="button" class="bcard add" data-click="openAddBudget"><span class="add-plus">${icon('plus')}</span><b>Add a budget</b><small>Create a spending limit for a new category</small></button>` : '');
  renderIcons(grid);
}

function fillBudgetCategories(editingId, selected) {
  document.getElementById('b-cat').innerHTML = categoryChoices(state.budgets, editingId).map(c =>
    `<option value="${c.key}"${c.taken ? ' disabled' : ''}>${escHtml((CATS[c.key] || CATS.other).label)}${c.taken ? ' (Already has a budget)' : ''}</option>`).join('');
  document.getElementById('b-cat').value = selected;
}
function setBudgetError(field, message) {
  const el = document.getElementById(field === 'cat' ? 'b-cat-err' : 'b-limit-err'); el.textContent = message || ''; el.hidden = !message;
  document.getElementById(field === 'cat' ? 'b-cat' : 'b-limit').setAttribute('aria-invalid', message ? 'true' : 'false');
}
function updateBudgetHint() {
  const category = document.getElementById('b-cat').value, spent = lastMonthSpent(state.transactions, category, new Date(), exchangeRates());
  const hint = document.getElementById('b-hint'); hint.hidden = !(spent > 0); hint.dataset.amount = String(Math.round(spent));
  if (spent > 0) document.getElementById('b-hint-text').textContent = `Last month you spent ${fmtKes(spent)} on ${(CATS[category] || CATS.other).label}.`;
}
function openAddBudget() {
  const free = categoryChoices(state.budgets).find(c => !c.taken);
  if (!free) { showToast('Every category already has a budget.', 'info'); return; }
  state.ui.editBudgetId = null;
  document.getElementById('budget-modal-title').textContent = 'New budget'; document.getElementById('b-save-label').textContent = 'Create budget';
  fillBudgetCategories(null, free.key); document.getElementById('b-limit').value = '';
  setBudgetError('cat', ''); setBudgetError('limit', ''); updateBudgetHint();
  openModal('budget-modal'); setTimeout(() => document.getElementById('b-limit').focus(), 60);
}
function openEditBudget(id) {
  const b = state.budgets.find(x => x.id === id); if (!b) return;
  state.ui.editBudgetId = id;
  document.getElementById('budget-modal-title').textContent = 'Edit budget'; document.getElementById('b-save-label').textContent = 'Save changes';
  fillBudgetCategories(id, b.category); document.getElementById('b-limit').value = String(b.limit);
  setBudgetError('cat', ''); setBudgetError('limit', ''); updateBudgetHint();
  openModal('budget-modal');
}
function budgetCatChanged() { setBudgetError('cat', ''); updateBudgetHint(); }
function budgetLimitInput() { setBudgetError('limit', ''); }
function budgetEnter(e) { if (e.key === 'Enter') { e.preventDefault(); saveBudget(); } }
function useLastMonth() {
  const amount = Number(document.getElementById('b-hint').dataset.amount) || 0;
  if (amount > 0) { document.getElementById('b-limit').value = String(amount); setBudgetError('limit', ''); document.getElementById('b-limit').focus(); }
}
function saveBudget() {
  const category = document.getElementById('b-cat').value, limit = parseAmount(document.getElementById('b-limit').value), editing = state.ui.editBudgetId;
  setBudgetError('cat', ''); setBudgetError('limit', '');
  if (state.budgets.some(b => b.category === category && b.id !== editing)) { setBudgetError('cat', 'A budget for this category already exists.'); document.getElementById('b-cat').focus(); return; }
  if (!Number.isFinite(limit) || limit <= 0) { setBudgetError('limit', 'Enter a limit greater than zero.'); document.getElementById('b-limit').focus(); return; }
  const now = new Date().toISOString();
  if (editing) {
    const idx = state.budgets.findIndex(b => b.id === editing);
    if (idx !== -1) state.budgets[idx] = { ...state.budgets[idx], category, limit, updatedAt: now, dirty: true };
  } else state.budgets.push({ id: uid(), category, limit, period: 'monthly', updatedAt: now, dirty: true });
  Store.set('budgets', state.budgets); closeModal('budget-modal');
  showToast(editing ? 'Budget updated' : 'Budget created', 'success');
  renderBudgetsPage(); renderDashboard();
  const sb = getSbClient(); if (sb) syncNow();
}

function openRaiseLimit(id) {
  const row = budgetRows(state.budgets, state.transactions, new Date(), exchangeRates()).find(r => r.budget.id === id); if (!row) return;
  state.ui.raiseId = id;
  const label = (CATS[row.budget.category] || CATS.other).label;
  document.getElementById('raise-title').textContent = `Raise ${label} limit`;
  document.getElementById('raise-info').textContent = `Current limit ${fmtKes(row.budget.limit)}. Spent ${fmtKes(row.spent)}.`;
  document.getElementById('raise-limit').value = String(suggestRaise(row.spent));
  const err = document.getElementById('raise-err'); err.hidden = true;
  openModal('budget-raise'); setTimeout(() => document.getElementById('raise-limit').select(), 60);
}
function raiseInput() { document.getElementById('raise-err').hidden = true; }
function raiseEnter(e) { if (e.key === 'Enter') { e.preventDefault(); saveRaise(); } }
function saveRaise() {
  const b = state.budgets.find(x => x.id === state.ui.raiseId); if (!b) return;
  const value = parseAmount(document.getElementById('raise-limit').value), err = document.getElementById('raise-err');
  if (!Number.isFinite(value) || value <= b.limit) { err.textContent = `Enter an amount above the current limit (${fmtKes(b.limit)}).`; err.hidden = false; document.getElementById('raise-limit').focus(); return; }
  b.limit = value; b.updatedAt = new Date().toISOString(); b.dirty = true;
  Store.set('budgets', state.budgets); closeModal('budget-raise');
  showToast(`${(CATS[b.category] || CATS.other).label} limit raised to ${fmtKes(value)}`, 'success');
  renderBudgetsPage(); renderDashboard();
  const sb = getSbClient(); if (sb) syncNow();
}
function viewBudgetTx(category) {
  const bounds = periodBounds('month');
  resetTxFilters(); Object.assign(state.ui, { txCats: [category], txFrom: bounds.from, txTo: bounds.to });
  _keepTxFilters = true; goPage('transactions', null);
}
function openBudgetMenu(id, button) {
  const b = state.budgets.find(x => x.id === id); if (!b) return;
  if (isPhone()) { state.ui.menuBudgetId = id; document.getElementById('ba-title').textContent = (CATS[b.category] || CATS.other).label; openModal('budget-actions'); return; }
  showRowMenu(button, [{ label: 'Edit', icon: 'edit', run: () => openEditBudget(id) }, { label: 'Delete', icon: 'delete', danger: true, run: () => confirmDel('budget', id) }]);
}
function baEdit() { const id = state.ui.menuBudgetId; closeModal('budget-actions'); if (id) openEditBudget(id); }
function baDelete() { const id = state.ui.menuBudgetId; closeModal('budget-actions'); if (id) confirmDel('budget', id); }
let _keepTxFilters = false;



// ─── Budgets page ──────────────────────────────────────────
// ─── Analytics ─────────────────────────────────────────────
function renderAnalytics(){
  const totalSaved=totalKes(state.transactions.filter(t=>t.type==='savings'));
  const fireTarget=CFG.getNum('fireTarget',3000000);
  const firePct=Math.min((totalSaved/fireTarget)*100,100);
  const allDates=new Set(state.transactions.map(t=>t.date?.slice(0,7)).filter(Boolean));
  const avgMoSav=allDates.size>0?totalSaved/allDates.size:0;
  const yrs=avgMoSav>0?((fireTarget-totalSaved)/(avgMoSav*12)).toFixed(1):'∞';
  document.getElementById('fire-saved-lbl').textContent=`KES ${totalSaved.toLocaleString()} saved`;
  document.getElementById('fire-target-lbl').textContent=`Target: KES ${fireTarget.toLocaleString()}`;
  document.getElementById('fire-fill').style.width=firePct+'%';
  document.getElementById('fire-stats').innerHTML=[
    {v:firePct.toFixed(1)+'%',l:'Progress'},{v:yrs+' yrs',l:'At current rate'},
    {v:'KES '+(avgMoSav>0?(avgMoSav/1000).toFixed(1)+'K':'0'),l:'Avg monthly savings'},{v:'KES '+(fireTarget/1000).toFixed(0)+'K',l:'FIRE Target'}
  ].map(s=>`<div class="fs"><div class="fs-v">${s.v}</div><div class="fs-l">${s.l}</div></div>`).join('');
  drawTrendChart();renderHealthFactors();renderMonthlyTable();
}

function drawTrendChart(){
  const c=document.getElementById('trend-canvas');if(!c)return;
  const dpr=window.devicePixelRatio||1;c.width=c.offsetWidth*dpr;c.height=150*dpr;
  const ctx=c.getContext('2d');ctx.scale(dpr,dpr);
  const W=c.offsetWidth,H=150;ctx.clearRect(0,0,W,H);
  const now=new Date();const months=[],labels=[];
  for(let i=5;i>=0;i--){
    const m=new Date(monthKey(now,-i)+'-01T12:00:00Z');
    const ms=monthKey(now,-i);
    const s=totalKes(state.transactions.filter(t=>t.date?.startsWith(ms)&&t.type==='savings'));
    months.push(s);labels.push(m.toLocaleDateString('en',{month:'short'}));
  }
  if(months.every(v=>v===0)){ctx.fillStyle='#526071';ctx.textAlign='center';ctx.font='12px Inter';ctx.fillText('Add savings transactions to see trend',W/2,H/2);return}
  const maxV=Math.max(...months,1);const pL=10,pR=10,pT=14,pB=22,cW=W-pL-pR,cH=H-pT-pB;
  const step=cW/(labels.length-1||1);const pts=months.map((v,i)=>({x:pL+i*step,y:pT+cH*(1-v/maxV)}));
  ctx.strokeStyle='rgba(28,25,23,.05)';ctx.lineWidth=1;
  for(let i=0;i<=3;i++){const y=pT+cH*(1-i/3);ctx.beginPath();ctx.moveTo(pL,y);ctx.lineTo(W-pR,y);ctx.stroke()}
  const grad=ctx.createLinearGradient(0,pT,0,H);grad.addColorStop(0,'rgba(55,48,163,.14)');grad.addColorStop(1,'rgba(55,48,163,0)');
  ctx.beginPath();ctx.moveTo(pts[0].x,cH+pT);pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(pts[pts.length-1].x,cH+pT);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.strokeStyle='#3b5bfc';ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
  ctx.fillStyle='#526071';ctx.textAlign='center';ctx.font=`12px JetBrains Mono`;
  labels.forEach((l,i)=>ctx.fillText(l,pL+i*step,H-5));
}

function renderHealthFactors(){
  const now=new Date(),ms=monthKey(now);
  const inc=totalKes(state.transactions.filter(t=>t.date?.startsWith(ms)&&t.type==='income'));
  const exp=totalKes(state.transactions.filter(t=>t.date?.startsWith(ms)&&t.type==='expense'));
  const sav=totalKes(state.transactions.filter(t=>t.date?.startsWith(ms)&&t.type==='savings'));
  const sr=inc>0?(sav/inc)*100:0;
  const em=emergencyFundMonths(state.transactions, now, exchangeRates());
  const ba=state.budgets.length>0?(state.budgets.filter(b=>{
    const s=totalKes(state.transactions.filter(t=>t.date?.startsWith(ms)&&t.category===b.category&&t.type==='expense'));
    return s<=b.limit;
  }).length/state.budgets.length)*100:0;
  const factors=[
    {label:'SR',name:`Savings Rate (${sr.toFixed(0)}%)`,pct:Math.min(sr*5,100),color:'#059669',v:sr>=20?'Excellent':sr>=10?'Good':'Needs work'},
    {label:'EF',name:`Emergency Fund (${em.toFixed(1)} mo)`,pct:Math.min((em/6)*100,100),color:'#D97706',v:em>=6?'Excellent':em>=3?'Good':'Low'},
    {label:'BA',name:`Budget Adherence (${ba.toFixed(0)}%)`,pct:ba,color:'#3730A3',v:ba>=80?'Good':'Needs work'},
    {label:'ER',name:`Expense/Income Ratio (${inc>0?((exp/inc)*100).toFixed(0):0}%)`,pct:Math.max(0,100-(inc>0?(exp/inc)*100:100)),color:'#7C3AED',v:inc>0&&exp/inc<0.7?'Healthy':'High'},
  ];
  document.getElementById('health-factors').innerHTML=factors.map(f=>`
    <div style="display:flex;align-items:center;gap:10px">
      <div style="font-family:var(--fm);font-size:.75rem;font-weight:700;color:${f.color};background:${f.color}18;border-radius:4px;padding:3px 5px;flex-shrink:0;min-width:28px;text-align:center;letter-spacing:.02em">${f.label}</div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <div style="font-size:.75rem;font-weight:500;color:var(--ink)">${f.name}</div>
          <div style="font-size:.75rem;font-weight:700;color:${f.color};font-family:var(--fm)">${f.v}</div>
        </div>
        <div style="height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
          <div style="height:100%;border-radius:2px;width:${f.pct}%;background:${f.color};transition:width .8s ease"></div>
        </div>
      </div>
    </div>`).join('');
}

function renderMonthlyTable(){
  const now=new Date();
  document.getElementById('monthly-table').innerHTML=Array.from({length:6},(_,i)=>{
    const m=new Date(monthKey(now,-i)+'-01T12:00:00Z');
    const ms=monthKey(now,-i);
    const inc=totalKes(state.transactions.filter(t=>t.date?.startsWith(ms)&&t.type==='income'));
    const exp=totalKes(state.transactions.filter(t=>t.date?.startsWith(ms)&&t.type==='expense'));
    const sav=totalKes(state.transactions.filter(t=>t.date?.startsWith(ms)&&t.type==='savings'));
    const rate=inc>0?((sav/inc)*100).toFixed(1):0,net=inc-exp;
    return `<tr><td style="font-weight:600">${m.toLocaleDateString('en',{month:'short',year:'numeric'})}</td>
      <td><span class="td-mono pos">+${inc.toLocaleString()}</span></td>
      <td><span class="td-mono neg">-${exp.toLocaleString()}</span></td>
      <td><span class="td-mono" style="color:var(--blue)">${sav.toLocaleString()}</span></td>
      <td><span class="td-mono ${parseFloat(rate)>=20?'pos':'neg'}">${rate}%</span></td>
      <td><span class="td-mono ${net>=0?'pos':'neg'}">${net>=0?'+':''}${net.toLocaleString()}</span></td></tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// CRUD — TRANSACTIONS
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// ADD / EDIT TRANSACTION: amount first; everything else has a sensible default (rules in addflow.js)
// ═══════════════════════════════════════════════════════════
function renderTxForm() {
  const type = document.getElementById('tx-type').value, cat = document.getElementById('tx-cat').value;
  document.querySelectorAll('#tx-type-seg .pb').forEach(b => {
    const on = b.dataset.txType === type; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
  });
  let quick = quickCategories(state.transactions, type);
  if (!quick.includes(cat)) quick = [cat, ...quick.filter(k => k !== 'other').slice(0, 2), 'other'].filter((k, i, a) => a.indexOf(k) === i).slice(0, 4);
  const moreOpen = !document.getElementById('tx-cat').hidden;
  document.getElementById('tx-chips').innerHTML = quick.map(key => {
    const c = CATS[key] || CATS.other;
    return `<button type="button" class="chip-btn${key === cat ? ' on' : ''}" aria-pressed="${key === cat}" data-click="setTxCat" data-click-args="${argsAttr([key])}">${icon(CAT_ICON[key] || 'dots')}${escHtml(c.label)}</button>`;
  }).join('') + `<button type="button" class="chip-btn more" aria-expanded="${moreOpen}" data-click="toggleCatSelect">${icon('dots')}More</button>`;
  document.getElementById('tx-cat-current').textContent = (CATS[cat] || CATS.other).label;
}
function setTxType(type) {
  document.getElementById('tx-type').value = type;
  state.ui.txCatManual = false;
  const desc = document.getElementById('tx-desc').value;
  document.getElementById('tx-cat').value = categoryForDescription(state.transactions, desc, type) || quickCategories(state.transactions, type)[0] || defaultCategory(type);
  document.getElementById('tx-cat').hidden = true;
  renderTxForm();
}
function toggleMoreTypes() {
  document.querySelectorAll('#tx-type-seg .extra-type').forEach(b => { b.hidden = false; });
  const link = document.getElementById('tx-more-types'); link.hidden = true; link.setAttribute('aria-expanded', 'true');
}
function setTxCat(key) {
  if (!CAT_KEYS.includes(key)) return;
  document.getElementById('tx-cat').value = key; state.ui.txCatManual = true; renderTxForm();
}
function toggleCatSelect() {
  const select = document.getElementById('tx-cat'); select.hidden = !select.hidden;
  renderTxForm(); if (!select.hidden) select.focus();
}
function toggleTxDetails(force) {
  const box = document.getElementById('tx-details'), btn = document.getElementById('tx-more-btn');
  const open = typeof force === 'boolean' ? force : box.hidden;
  box.hidden = !open; btn.setAttribute('aria-expanded', String(open));
}
function updateKesHint() {
  const hint = document.getElementById('tx-kes-hint'), currency = document.getElementById('tx-currency').value;
  const amount = parseAmount(document.getElementById('tx-amount').value);
  if (currency === 'KES' || !Number.isFinite(amount) || amount <= 0) { hint.hidden = true; return; }
  const rate = exchangeRates()[currency];
  hint.textContent = `About ${fmtKes(convertToKes(amount, currency, exchangeRates()))} at 1 ${currency} = KES ${rate} (your saved estimate)`;
  hint.hidden = false;
}
function setFieldError(message) {
  const el = document.getElementById('tx-amount-err');
  el.textContent = message || ''; el.hidden = !message;
  document.getElementById('tx-amount-block').classList.toggle('invalid', Boolean(message));
  document.getElementById('tx-amount').setAttribute('aria-invalid', message ? 'true' : 'false');
}
function txAmountInput() { setFieldError(''); document.getElementById('tx-error').hidden = true; updateKesHint(); }
function txCurrencyChanged() { updateKesHint(); }
function txDescInput() {
  if (state.ui.txCatManual) return;
  const found = categoryForDescription(state.transactions, document.getElementById('tx-desc').value, document.getElementById('tx-type').value);
  if (found && document.getElementById('tx-cat').value !== found) { document.getElementById('tx-cat').value = found; renderTxForm(); }
}
function txEnterSaves(e) { if (e.key === 'Enter') { e.preventDefault(); saveTx(); } }

function resetTxForm({ keep = false } = {}) {
  if (!keep) {
    document.getElementById('tx-type').value = 'expense';
    document.getElementById('tx-cat').value = quickCategories(state.transactions, 'expense')[0] || 'food';
    document.getElementById('tx-date').value = nairobiDate();
    document.getElementById('tx-currency').value = 'KES';
    state.ui.txCatManual = false;
  }
  ['tx-amount', 'tx-desc', 'tx-notes'].forEach(id => { document.getElementById(id).value = ''; });
  setFieldError(''); document.getElementById('tx-error').hidden = true; document.getElementById('tx-kes-hint').hidden = true;
}
function openAddTx() {
  state.ui.editTxId = null;
  document.getElementById('tx-modal-title').textContent = 'Add transaction';
  document.getElementById('tx-save-label').textContent = 'Save';
  document.getElementById('tx-again-btn').hidden = false;
  resetTxForm();
  document.getElementById('tx-cat').hidden = true;
  document.querySelectorAll('#tx-type-seg .extra-type').forEach(b => { b.hidden = true; });
  const more = document.getElementById('tx-more-types'); more.hidden = false; more.setAttribute('aria-expanded', 'false');
  toggleTxDetails(false);
  renderTxForm();
  openModal('tx-modal');
  setTimeout(() => document.getElementById('tx-amount').focus(), 60);
}
function openEditTx(id) {
  const tx = state.transactions.find(t => t.id === id); if (!tx) return;
  state.ui.editTxId = id; state.ui.txCatManual = true;
  document.getElementById('tx-modal-title').textContent = 'Edit transaction';
  document.getElementById('tx-save-label').textContent = 'Save changes';
  document.getElementById('tx-again-btn').hidden = true;
  setFieldError(''); document.getElementById('tx-error').hidden = true;
  document.getElementById('tx-amount').value = String(tx.amount);
  document.getElementById('tx-desc').value = tx.description;
  document.getElementById('tx-type').value = tx.type;
  document.getElementById('tx-cat').value = tx.category; document.getElementById('tx-cat').hidden = true;
  document.getElementById('tx-date').value = tx.date;
  document.getElementById('tx-notes').value = tx.notes || '';
  document.getElementById('tx-currency').value = tx.currency || 'KES';
  const extra = tx.type === 'savings' || tx.type === 'transfer';
  document.querySelectorAll('#tx-type-seg .extra-type').forEach(b => { b.hidden = !extra; });
  const more = document.getElementById('tx-more-types'); more.hidden = extra;
  toggleTxDetails(true); updateKesHint(); renderTxForm();
  openModal('tx-modal');
}
function saveTx(again = false) {
  const amountInput = document.getElementById('tx-amount');
  const amount = parseAmount(amountInput.value);
  setFieldError(''); document.getElementById('tx-error').hidden = true;
  if (!Number.isFinite(amount) || amount <= 0) { setFieldError('Enter an amount greater than zero.'); amountInput.focus(); return; }
  const date = document.getElementById('tx-date').value;
  if (!date) {
    toggleTxDetails(true);
    const box = document.getElementById('tx-error'); box.textContent = 'Choose the transaction date.'; box.hidden = false;
    document.getElementById('tx-date').focus(); return;
  }
  const category = document.getElementById('tx-cat').value, type = document.getElementById('tx-type').value;
  const description = document.getElementById('tx-desc').value.trim() || defaultDescription(category, type);
  const notes = document.getElementById('tx-notes').value.trim();
  const currency = (document.getElementById('tx-currency').value || 'KES').toUpperCase();
  const savedKes = convertToKes(amount, currency, exchangeRates());
  const now = new Date().toISOString();
  let undo;
  if (state.ui.editTxId) {
    const idx = state.transactions.findIndex(t => t.id === state.ui.editTxId);
    if (idx !== -1) {
      const before = { ...state.transactions[idx] };
      state.transactions[idx] = { ...before, amount, description, category, type, date, notes, currency, amountKes: savedKes, updatedAt: now, dirty: true };
      undo = () => undoTx({ restore: before });
    }
  } else {
    const id = uid();
    state.transactions.push({ id, amount, description, category, type, date, notes, currency, amountKes: savedKes, source: 'manual', createdAt: now, updatedAt: now, dirty: true });
    undo = () => undoTx({ created: id });
  }
  Store.set('transactions', state.transactions);
  if (again === true && !state.ui.editTxId) {
    resetTxForm({ keep: true }); toggleTxDetails(false); renderTxForm(); amountInput.focus();
  } else closeModal('tx-modal');
  renderAll(); renderTxPage();
  showToast(state.ui.editTxId ? 'Transaction updated' : 'Transaction saved', 'success', undo ? { action: { label: 'Undo', run: undo } } : {});
  const sb = getSbClient(); if (sb) syncNow();
}
function undoTx({ created, restore }) {
  if (created) {
    state.transactions = state.transactions.filter(t => t.id !== created);
    recordDelete('transactions', created);
  } else if (restore) {
    const idx = state.transactions.findIndex(t => t.id === restore.id);
    const back = { ...restore, updatedAt: new Date().toISOString(), dirty: true };
    if (idx !== -1) state.transactions[idx] = back; else state.transactions.push(back);
  }
  Store.set('transactions', state.transactions);
  renderAll(); renderTxPage();
  showToast('Undone', 'info');
  const sb = getSbClient(); if (sb) syncNow();
}

// ─── Transaction details (bottom sheet on phones, dialog on larger screens) ───
function openTxDetail(id) {
  const tx = state.transactions.find(t => t.id === id); if (!tx) return;
  state.ui.detailId = id;
  const cat = CATS[tx.category] || CATS.other, income = tx.type === 'income';
  const amt = document.getElementById('td-amt');
  amt.className = 'detail-amt ' + (income ? 'in' : tx.type === 'savings' ? 'sav' : 'out');
  amt.textContent = `${income ? '+' : '-'}${fmtKes(txAmountKes(tx))}`;
  if (tx.currency && tx.currency !== 'KES') amt.insertAdjacentHTML('beforeend', `<small>${escHtml(tx.currency)} ${Number(tx.amount).toLocaleString('en-KE')}</small>`);
  document.getElementById('td-name').textContent = tx.description;
  document.getElementById('td-cat').innerHTML = `<span class="sw" style="background:${cat.color}"></span>${escHtml(cat.label)}`;
  document.getElementById('td-date').textContent = nairobiFmt(new Date(`${tx.date}T12:00:00Z`), { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('td-src').textContent = tx.source === 'import' ? 'Imported from M-Pesa statement' : 'Added manually';
  document.getElementById('td-notes').textContent = tx.notes || 'No notes';
  openModal('tx-detail');
}
function detailEdit() { const id = state.ui.detailId; closeModal('tx-detail'); if (id) openEditTx(id); }
function detailDelete() { const id = state.ui.detailId; closeModal('tx-detail'); if (id) confirmDel('tx', id); }

// ─── More page (phones) ───
function renderMore() {
  const card = document.getElementById('more-sync'); if (!card) return;
  const signedIn = activeProfile !== 'local', label = document.getElementById('sync-label').textContent;
  const dot = document.getElementById('sync-dot').className.replace('sync-dot', '').trim() || 'local';
  document.getElementById('more-chip').textContent = signedIn ? 'Signed in' : 'Local only';
  document.getElementById('more-chip').className = 'chip ' + (signedIn ? 'up' : '');
  document.getElementById('more-av').textContent = (CFG.get('name') || 'Y').charAt(0).toUpperCase();
  document.getElementById('more-foot').hidden = signedIn;
  card.innerHTML = signedIn
    ? `<div class="ms-head"><span class="sync-dot ${dot}"></span><b>Signed in${state.ui.email ? ' as ' + escHtml(state.ui.email) : ''}</b></div><p>${escHtml(label)}</p><div class="ms-acts"><button class="btn-secondary" data-click="syncNow">Sync now</button><button class="btn-danger-sm" data-click="confirmSignOut">Sign out</button></div>`
    : `<div class="ms-head"><span class="sync-dot local"></span><b>Saved on this device</b></div><p>Sign in to back up your records and use them on another device.</p><button class="btn-secondary" data-click="openModal" data-click-args='["auth-modal"]'>Sign in to sync</button>`;
}

// The phone layout calls the first page "Home"; larger screens call it "Dashboard".
function applyPageTitle() {
  const id = document.querySelector('.page.on')?.id?.replace('page-', '') || 'dashboard';
  const titles = { dashboard: matchMedia('(max-width:768px)').matches ? 'Home' : 'Dashboard', transactions: 'Transactions', budgets: 'Budgets', analytics: 'Analytics', mpesa: 'M-Pesa Import', settings: 'Settings', more: 'More' };
  document.getElementById('tb-title').childNodes[0].textContent = (titles[id] || id) + ' ';
}
function openAddChoice() { openModal('add-choice'); }
function chooseAdd(kind) {
  closeModal('add-choice');
  if (kind === 'import') goPage('mpesa', null); else openAddTx();
}

// ═══════════════════════════════════════════════════════════
// CRUD — BUDGETS
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════
function confirmDel(type,id){
  const item=type==='tx'?state.transactions.find(t=>t.id===id):state.budgets.find(b=>b.id===id);
  if(!item)return;
  const name=type==='tx'?item.description:(CATS[item.category]||CATS.other).label;
  state.pendingDel={type,id};
  askConfirm({title:type==='tx'?'Delete transaction?':'Delete budget?',sub:type==='tx'?`${name} will be permanently deleted. This cannot be undone.`:`The ${name} budget will be deleted. Your transactions are not affected.`,okLabel:'Delete',onOk:execDel});
}
// Shared confirmation dialog (confirm-modal): used for deletes and for the unsynced sign-out warning.
function askConfirm({title,sub,okLabel,onOk}){
  document.getElementById('cm-title').textContent=title;
  document.getElementById('cm-sub').textContent=sub;
  const ok=document.getElementById('cm-ok');
  ok.textContent=okLabel;
  ok.onclick=onOk;
  openModal('confirm-modal');
}
// Deletes are remembered as tombstones until the server has them, so a later sync cannot bring the row back.
function recordDelete(table,id){
  if(activeProfile==='local')return;
  state.tombstones=addTombstone(state.tombstones,table,id,new Date().toISOString());
  Store.set('tombstones',state.tombstones);
}
function execDel(){
  const{type,id}=state.pendingDel;
  if(type==='tx'){
    state.transactions=state.transactions.filter(t=>t.id!==id);
    Store.set('transactions',state.transactions);
    recordDelete('transactions',id);
    showToast('Transaction deleted','info');renderAll();renderTxPage();
  }else{
    state.budgets=state.budgets.filter(b=>b.id!==id);
    Store.set('budgets',state.budgets);
    recordDelete('budgets',id);
    showToast('Budget deleted','info');renderBudgetsPage();
  }
  closeModal('confirm-modal');
  const sb=getSbClient();if(sb)syncNow();
}

// ═══════════════════════════════════════════════════════════
// MPESA IMPORT
// ═══════════════════════════════════════════════════════════
const IMPORT_PRIVACY = 'The PDF is opened in your browser and never uploaded. The transaction text (dates, amounts, merchant and counterparty names) is sent through Netlify to Anthropic to be categorised after you agree. Phone numbers are removed first.';
let imp = { step: 'upload', file: null, cancelled: false, rows: [], rejected: 0, repeats: 0, failedParts: [], chunks: [], byChunk: [], classified: null, recon: null, range: { from: '', to: '' } };
const CAT_OPTIONS = key => CAT_KEYS.map(k => `<option value="${k}"${k === key ? ' selected' : ''}>${escHtml((CATS[k] || CATS.other).label)}</option>`).join('');
const IMPORT_STATUS_TEXT = { success: 'Success', partial: 'Partly imported', failed: 'Failed' };

function impStep(step) {
  imp.step = step;
  ['upload', 'reading', 'review', 'done', 'failed'].forEach(name => { document.getElementById('imp-' + name).hidden = name !== step; });
  document.getElementById('imp-upload-extra').hidden = step !== 'upload';
  const position = { upload: 0, reading: 0, review: 1, done: 2, failed: 0 }[step];
  document.querySelectorAll('#imp-stepper li').forEach((li, i) => {
    li.classList.toggle('on', i === position); li.classList.toggle('done', i < position);
    if (i === position) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  document.getElementById('content').scrollTop = 0;
}
function impError(message) {
  const el = document.getElementById('imp-err'); el.textContent = message || ''; el.hidden = !message;
}

// ─── Step 1: choose the PDF ───
function dzDrag(e, on) { e.preventDefault(); document.getElementById('drop-zone').classList.toggle('drag', on); }
function dzDrop(e) { e.preventDefault(); dzDrag(e, false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }
function handlePDF(inp) { if (inp.files[0]) setFile(inp.files[0]); }
function choosePdf(e) { e?.preventDefault?.(); document.getElementById('pdf-file').click(); }
function setFile(f) {
  if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { impError('That is not a PDF. Choose the statement PDF from Safaricom.'); return; }
  impError(''); imp.file = f;
  document.getElementById('fp-name').textContent = f.name;
  document.getElementById('fp-size').textContent = (f.size / 1024).toFixed(0) + ' KB';
  document.getElementById('file-card').hidden = false;
  document.getElementById('import-btn').disabled = false;
}
function clearFile() {
  imp.file = null; document.getElementById('file-card').hidden = true; document.getElementById('pdf-file').value = '';
  document.getElementById('import-btn').disabled = true;
}

// PDF.js is self-hosted (copied to public/vendor/ by scripts/build.mjs) and loaded on first use.
let _pdfjs = null;
async function loadPdfJs() {
  if (_pdfjs) return _pdfjs;
  const lib = await import(new URL('vendor/pdfjs/pdf.min.mjs', document.baseURI).href);
  lib.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
  return (_pdfjs = lib);
}
async function readPdfText(file, password) {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({
    data: await file.arrayBuffer(), password,
    isEvalSupported: false,   // hardening: never compile code from PDF content
    cMapUrl: 'vendor/pdfjs/cmaps/', cMapPacked: true, standardFontDataUrl: 'vendor/pdfjs/standard_fonts/',
  }).promise;
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    // hasEOL keeps statement rows on their own lines, which keeps chunks aligned to rows
    text += content.items.map(i => i.str + (i.hasEOL ? '\n' : ' ')).join('') + '\n';
  }
  return text;
}

// ─── Step 2: reading (nothing is saved here) ───
function renderReading(stage, detail = '') {
  const stages = ['Opening PDF in your browser', 'Reading transactions', 'Categorising with Fyn AI', 'Checking for duplicates', 'Preparing review'];
  document.getElementById('imp-reading').innerHTML = `<div class="card imp-reading">
    <div class="card-hdr"><h2>Reading your statement</h2></div>
    <p class="muted">Nothing is saved until you confirm.</p>
    <div class="imp-bar" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round((stage / stages.length) * 100)}"><span style="width:${Math.round(((stage - 0.5) / stages.length) * 100)}%"></span></div>
    <ol class="imp-stages">${stages.map((label, i) => {
      const state = i + 1 < stage ? 'done' : i + 1 === stage ? 'active' : 'queued';
      const text = i === 2 && detail ? `${label} - ${detail}` : label;
      return `<li class="${state}"><span class="st-dot">${state === 'done' ? icon('check') : ''}</span><span>${escHtml(text)}</span><em>${state === 'done' ? 'Done' : state === 'active' ? 'In progress' : 'Waiting'}</em></li>`;
    }).join('')}</ol>
    <div class="imp-actions"><button class="btn-secondary" data-click="impCancel">Cancel</button></div></div>`;
}
function impCancel() { imp.cancelled = true; impStep('upload'); }

async function parseChunks(indices) {
  for (const i of indices) {
    if (imp.cancelled) return false;
    renderReading(3, `part ${i + 1} of ${imp.chunks.length}`);
    try {
      const data = await postAi({ mode: 'import', text: imp.chunks[i] });
      imp.byChunk[i] = Array.isArray(data.transactions) ? data.transactions : [];
      imp.rejected += data.rejected || 0;
      imp.failedParts = imp.failedParts.filter(n => n !== i);
    } catch (e) {
      if (/sign in|agree|limit/i.test(e.message)) throw e;   // not worth trying the other parts
      if (!imp.failedParts.includes(i)) imp.failedParts.push(i);
    }
  }
  return true;
}
function buildReview() {
  const { rows, repeats } = dedupeWithinFile(imp.byChunk.flat());
  imp.rows = rows; imp.repeats = repeats;
  imp.classified = classifyRows(rows, state.transactions, imp.range);
  imp.recon = reconcile(rows, imp.totals, { rangeSet: Boolean(imp.range.from || imp.range.to) });
}

async function runImport() {
  if (!imp.file) { impError('Choose a PDF first.'); return; }
  const from = document.getElementById('imp-from').value, to = document.getElementById('imp-to').value;
  if (from && to && from > to) { impError('The start date is after the end date.'); return; }
  impError('');
  // Sign in and consent come first, so nobody waits for a PDF to read and then hits a wall.
  try {
    if (!(await getAccessToken())) throw new Error('Sign in to use AI features.');
    if (!(await ensureAiConsent())) throw new Error('AI features are off until you agree to send data to Claude.');
  } catch (e) { impFail(e, false); return; }
  Object.assign(imp, { cancelled: false, rows: [], rejected: 0, repeats: 0, failedParts: [], byChunk: [], range: { from, to } });
  impStep('reading'); renderReading(1);
  try {
    const text = await readPdfText(imp.file, document.getElementById('pdf-pw').value);
    if (imp.cancelled) return;
    if (!text.trim()) throw new Error('No text found in this PDF. Scanned statements are not supported.');
    renderReading(2);
    imp.chunks = splitChunks(text); imp.totals = statementTotals(text);
    if (!(await parseChunks(imp.chunks.map((_, i) => i)))) return;
    renderReading(4); await delay(250);
    buildReview();
    if (!imp.rows.length) throw new Error(imp.failedParts.length ? 'The AI could not read this statement.' : 'No transactions were found in this statement.');
    renderReading(5); await delay(250);
    renderImportReview(); impStep('review');
  } catch (e) { if (!imp.cancelled) impFail(e); }
}

function impFail(error, record = true) {
  const reason = failureReason(error);
  console.error('Import failed', error);
  if (record) {
    state.imports.push({ id: uid(), filename: imp.file?.name || 'statement.pdf', count: 0, skipped: 0, rejected: 0, date: new Date().toISOString(), status: 'failed', reason: reason.short });
    Store.set('imports', state.imports); renderImportHistory();
  }
  document.getElementById('imp-failed').innerHTML = `<div class="card imp-result bad">
    <span class="res-ico bad">${icon('alert')}</span><h2>Couldn't read this statement</h2>
    <p><b>${escHtml(reason.text)}</b></p><p class="muted">${escHtml(reason.next)}</p>
    <div class="imp-actions">${reason.code === 'signin' ? '<button class="btn-primary" data-click="openModal" data-click-args=\'["auth-modal"]\'>Sign in</button>' : ''}<button class="${reason.code === 'signin' ? 'btn-secondary' : 'btn-primary'}" data-click="impBack">Try again</button></div></div>`;
  impStep('failed');
}

// ─── Step 3: review ───
const impRows = () => [...imp.classified.fresh, ...imp.classified.check];
const impFind = key => impRows().find(r => r.key === key);
function reviewRow(row, kind) {
  const cat = CATS[row.category] || CATS.other, sign = row.type === 'income' ? '+' : '-';
  const amt = `<span class="rv-amt ${row.type === 'income' ? 'in' : 'out'}">${sign}${fmtKes(row.amount)}</span>`;
  const meta = `${escHtml(shortDate(row.date))}${row.receipt ? ' · Ref ' + escHtml(row.receipt) : ''}`;
  if (kind === 'dup') return `<li class="rv-row"><span class="rv-main"><b>${escHtml(row.description)}</b><small>${meta} · Already in FynPet</small></span>${amt}</li>`;
  const select = `<select class="form-input rv-cat" aria-label="Category for ${escHtml(row.description)}" data-change="impSetCategory" data-change-args="${argsAttr([row.key, '$value'])}">${CAT_OPTIONS(row.category)}</select>`;
  if (kind === 'check') {
    const why = row.reason === 'possible-duplicate' ? 'Looks the same as a transaction you already have' : 'We could not tell the category';
    return `<li class="rv-check" data-key="${row.key}"><div class="rv-main"><b>${escHtml(row.description)}</b><small>${meta}</small><span class="rv-why">${why}</span></div>${amt}${select}
      <button type="button" class="btn-secondary rv-toggle" data-click="impToggleRow" data-click-args="${argsAttr([row.key])}" aria-pressed="${row.include}">${row.include ? 'Skip this one' : 'Include anyway'}</button></li>`;
  }
  return `<li class="rv-row" data-key="${row.key}"><label class="rv-inc"><input type="checkbox" ${row.include ? 'checked' : ''} data-change="impToggleRow" data-change-args="${argsAttr([row.key])}" aria-label="Include ${escHtml(row.description)}"></label>
    <span class="rv-main"><b>${escHtml(row.description)}</b><small>${meta}</small></span>${select}${amt}</li>`;
}
function renderImportReview() {
  const c = imp.classified, total = imp.rows.length, check = c.check.length, dups = c.duplicates.length;
  const parts = [`${c.fresh.length} look good`]; if (dups) parts.push(`${dups} ${dups === 1 ? 'is' : 'are'} already in FynPet`);
  if (check) parts.push(`${check} ${check === 1 ? 'needs' : 'need'} your check`);
  const sentence = `We found ${total} transaction${total === 1 ? '' : 's'}. ` + (parts.length > 1 ? parts.slice(0, -1).join(', ') + ', and ' + parts.at(-1) : parts[0]) + '.';
  const r = imp.recon;
  const totals = r.status === 'match' ? `<div class="imp-banner ok">${icon('check')}<p><b>Totals match your statement:</b> money in ${fmtKes(r.moneyIn)}, money out ${fmtKes(r.moneyOut)}.</p></div>`
    : r.status === 'differs' ? `<div class="imp-banner warn">${icon('alert')}<p><b>Totals differ from your statement.</b> We read money in ${fmtKes(r.moneyIn)} (statement ${fmtKes(r.statementIn)}) and money out ${fmtKes(r.moneyOut)} (statement ${fmtKes(r.statementOut)}). Look through the rows before saving. Charges and fees are not imported.</p></div>`
    : r.status === 'skipped' ? `<div class="imp-banner">${icon('info')}<p>The totals check is skipped because you set a date range.</p></div>`
    : `<div class="imp-banner">${icon('info')}<p>We couldn't find totals in this statement to check against. Look through the rows before saving.</p></div>`;
  const failed = imp.failedParts.length ? `<div class="imp-banner warn">${icon('alert')}<p><b>${imp.failedParts.length === 1 ? 'One part' : imp.failedParts.length + ' parts'} of the statement could not be read.</b> Rows from ${imp.failedParts.length === 1 ? 'it are' : 'them are'} missing.</p><button class="btn-secondary" data-click="impRetry">Try again</button></div>` : '';
  const notes = [];
  if (c.outside.length) notes.push(`${c.outside.length} row${c.outside.length === 1 ? '' : 's'} outside your date range ${c.outside.length === 1 ? 'was' : 'were'} left out.`);
  if (imp.repeats) notes.push(`${imp.repeats} repeated row${imp.repeats === 1 ? '' : 's'} in the file ${imp.repeats === 1 ? 'was' : 'were'} counted once.`);
  if (imp.rejected) notes.push(`${imp.rejected} row${imp.rejected === 1 ? '' : 's'} could not be read and ${imp.rejected === 1 ? 'was' : 'were'} skipped.`);
  document.getElementById('imp-review').innerHTML = `
    <div class="card imp-summary"><h2>${escHtml(sentence)}</h2><p class="muted">We read your PDF on this device.${notes.length ? ' ' + escHtml(notes.join(' ')) : ''}</p></div>
    ${totals}${failed}
    ${check ? `<section class="card"><div class="card-hdr"><h2>Needs your check (${check})</h2></div><ul class="rv-list">${c.check.map(row => reviewRow(row, 'check')).join('')}</ul></section>` : ''}
    ${dups ? `<details class="card imp-fold"><summary>Already in FynPet (${dups}) <span class="muted">These will be skipped</span></summary><ul class="rv-list">${c.duplicates.map(row => reviewRow(row, 'dup')).join('')}</ul></details>` : ''}
    <details class="card imp-fold"${c.fresh.length && !check ? ' open' : ''}><summary>Looks good (${c.fresh.length}) <span class="muted">Suggested categories, ready to save</span></summary><ul class="rv-list">${c.fresh.map(row => reviewRow(row, 'fresh')).join('')}</ul></details>
    <section class="card privacy-note"><h3>How your data is handled</h3><p>${escHtml(IMPORT_PRIVACY)}</p></section>
    <div class="imp-footer" role="region" aria-label="Save"><div class="imp-foot-text" id="imp-foot-text" aria-live="polite"></div><button class="btn-secondary" data-click="impBack">Back</button><button class="btn-primary" id="imp-save" data-click="impSave"></button></div>`;
  updateReviewFooter();
}
function updateReviewFooter() {
  const chosen = impRows().filter(r => r.include), n = chosen.length;
  const sum = type => chosen.filter(r => type === 'in' ? r.type === 'income' : r.type !== 'income').reduce((a, r) => a + r.amount, 0);
  document.getElementById('imp-foot-text').innerHTML = `<b>${n} will be saved</b><span>Money out ${fmtKes(sum('out'))} · Money in ${fmtKes(sum('in'))}</span>`;
  const btn = document.getElementById('imp-save'); btn.disabled = n === 0; btn.textContent = n === 1 ? 'Save 1 transaction' : `Save ${n} transactions`;
}
function impToggleRow(key) {
  const row = impFind(key); if (!row) return;
  row.include = !row.include;
  const el = document.querySelector(`#imp-review [data-key="${key}"]`);
  const btn = el?.querySelector('.rv-toggle'); if (btn) { btn.textContent = row.include ? 'Skip this one' : 'Include anyway'; btn.setAttribute('aria-pressed', String(row.include)); }
  const box = el?.querySelector('input[type=checkbox]'); if (box) box.checked = row.include;
  updateReviewFooter();
}
function impSetCategory(key, value) { const row = impFind(key); if (row && CAT_KEYS.includes(value)) row.category = value; }
async function impRetry() {
  imp.cancelled = false; impStep('reading'); renderReading(3);
  try { if (!(await parseChunks([...imp.failedParts]))) return; buildReview(); renderImportReview(); impStep('review'); }
  catch (e) { impFail(e); }
}
function impBack() { impStep('upload'); }

// ─── Save (the only place that writes records) ───
function impSave() {
  const chosen = impRows().filter(r => r.include), batch = uid();
  let saved = 0;
  for (const r of chosen) {
    const clean = normalizeTx({ description: r.description, amount: r.amount, type: r.type, category: r.category, date: r.date, externalRef: r.receipt || undefined, id: uid(), source: 'import', importBatch: batch, dirty: true });
    if (clean) { state.transactions.push(clean); saved++; }
  }
  const left = impRows().length - chosen.length, dups = imp.classified.duplicates.length;
  const unread = imp.rejected + (chosen.length - saved);
  const status = importStatus({ saved, unreadRows: unread, failedParts: imp.failedParts.length });
  state.imports.push({ id: batch, filename: imp.file?.name || 'statement.pdf', count: saved, skipped: dups + left, rejected: unread, date: new Date().toISOString(), status });
  Store.set('transactions', state.transactions); Store.set('imports', state.imports);
  const dates = chosen.map(r => r.date).sort(), period = dates.length ? (dates[0] === dates.at(-1) ? shortDate(dates[0]) : `${shortDate(dates[0])} - ${shortDate(dates.at(-1))} ${dates.at(-1).slice(0, 4)}`) : '';
  renderAll(); renderImportHistory();
  const partly = status === 'partial';
  document.getElementById('imp-done').innerHTML = `<div class="card imp-result ${partly ? 'warn' : 'ok'}">
    <span class="res-ico ${partly ? 'warn' : 'ok'}">${icon(partly ? 'alert' : 'check')}</span>
    <span class="chip ${partly ? 'warn' : 'up'}">${partly ? 'Partly imported' : 'Success'}</span>
    <h2>${saved} transaction${saved === 1 ? '' : 's'} saved</h2>
    <p class="muted">Saved on this device. Your PDF was not uploaded.${period ? ' Statement period: ' + escHtml(period) + '.' : ''}</p>
    ${partly ? `<p>${unread ? `${unread} row${unread === 1 ? '' : 's'} could not be read and ${unread === 1 ? 'was' : 'were'} skipped. ` : ''}${imp.failedParts.length ? `${imp.failedParts.length} part${imp.failedParts.length === 1 ? '' : 's'} of the statement could not be read.` : ''}</p>` : ''}
    <dl class="res-stats"><div><dt>Saved</dt><dd>${saved}</dd></div><div><dt>Skipped as duplicates</dt><dd>${dups}</dd></div><div><dt>Left out by you</dt><dd>${left}</dd></div></dl>
    <div class="imp-actions"><button class="btn-primary" data-click="goPage" data-click-args='["transactions",null]'>View transactions</button><button class="btn-secondary" data-click="impReset">Import another statement</button></div></div>`;
  impStep('done');
  const sb = getSbClient(); if (sb) syncNow();
}
function impReset() { clearFile(); document.getElementById('pdf-pw').value = ''; Object.assign(imp, { rows: [], classified: null, recon: null, failedParts: [], byChunk: [] }); impStep('upload'); }

function renderImportHistory() {
  const el = document.getElementById('import-history'); if (!el) return;
  if (!state.imports.length) { el.innerHTML = '<p class="empty-note">No imports yet. Your first statement will appear here.</p>'; return; }
  el.innerHTML = `<div class="hist"><table><thead><tr><th scope="col">File</th><th scope="col">Imported on</th><th scope="col">Saved</th><th scope="col">Skipped</th><th scope="col">Status</th></tr></thead><tbody>${state.imports.slice().reverse().map(i => {
    const word = i.status === 'failed' ? `Failed${i.reason ? ' (' + escHtml(i.reason) + ')' : ''}` : IMPORT_STATUS_TEXT[i.status] || 'Success';
    return `<tr><td class="h-file">${escHtml(i.filename)}</td><td>${escHtml(nairobiFmt(new Date(i.date), { day: 'numeric', month: 'short', year: 'numeric' }))}</td><td>${i.count}</td><td>${(i.skipped || 0) + (i.rejected || 0)}</td><td><span class="st ${escHtml(i.status)}">${word}</span></td></tr>`;
  }).join('')}</tbody></table></div>`;
}


// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════
let _authTab = 'in';

function setAuthTab(tab) {
  _authTab = tab;
  const inBtn = document.getElementById('auth-tab-in');
  const upBtn = document.getElementById('auth-tab-up');
  const submitBtn = document.getElementById('auth-submit-btn');
  const pwInput = document.getElementById('auth-password');
  if (tab === 'in') {
    inBtn.style.cssText = 'flex:1;padding:7px;border-radius:6px;border:none;font-size:.75rem;font-weight:600;cursor:pointer;background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.08)';
    upBtn.style.cssText = 'flex:1;padding:7px;border-radius:6px;border:none;font-size:.75rem;font-weight:600;cursor:pointer;background:transparent;color:var(--ink3)';
    submitBtn.textContent = 'Sign In';
    pwInput.autocomplete = 'current-password';
  } else {
    upBtn.style.cssText = 'flex:1;padding:7px;border-radius:6px;border:none;font-size:.75rem;font-weight:600;cursor:pointer;background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.08)';
    inBtn.style.cssText = 'flex:1;padding:7px;border-radius:6px;border:none;font-size:.75rem;font-weight:600;cursor:pointer;background:transparent;color:var(--ink3)';
    submitBtn.textContent = 'Create Account';
    pwInput.autocomplete = 'new-password';
  }
  document.getElementById('auth-error').style.display = 'none';
}

async function submitAuth() {
  const sb = getSbClient();
  if (!sb) { showToast('Supabase not connected', 'error'); return; }
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { _showAuthError('Enter email and password'); return; }
  const btn = document.getElementById('auth-submit-btn');
  btn.textContent = 'Please wait…'; btn.disabled = true;
  document.getElementById('auth-error').style.display = 'none';
  try {
    const result = _authTab === 'in'
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/' } });
    if (result.error) throw result.error;
    if (_authTab === 'up') {
      showToast('Account created! Check your email to confirm.', 'success');
      btn.textContent = 'Create Account'; btn.disabled = false;
    }
    // onAuthStateChange handles the rest on SIGNED_IN event
  } catch(e) {
    _showAuthError(e.message || 'Authentication failed');
    btn.textContent = _authTab === 'in' ? 'Sign In' : 'Create Account';
    btn.disabled = false;
  }
}

function _showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg; el.style.display = 'block';
}

function skipAuth() {
  closeModal('auth-modal');
  sbClient = null;
  setSyncStatus('local', 'Local only');
}

async function signOut(force = false) {
  const sb = getSbClient();
  // Push pending changes before the cache is cleared. If that fails and something is unsynced, ask first.
  if (!force && activeProfile !== 'local') {
    const result = sb ? await syncNow() : { ok: false };
    if (!result.ok && hasUnsyncedChanges()) {
      askConfirm({
        title: 'Sign out without syncing?',
        sub: 'Your latest changes could not be synced. If you sign out now they will be removed from this device.',
        okLabel: 'Sign out anyway',
        onOk: () => { closeModal('confirm-modal'); signOut(true); },
      });
      return;
    }
  }
  if (sb) await sb.auth.signOut().catch(e => console.error('Sign-out error:', e));
  // Remove this account's cached data from the device, then show the local profile.
  if (activeProfile !== 'local') {
    Store.clear(activeProfile);
    switchProfile('local');
  }
  setSyncStatus('local', 'Signed out');
  showToast('Signed out — account data removed from this device', 'info');
}

// ─── Profiles: keep each account's data separate on this device ───
function switchProfile(p) {
  activeProfile = p;
  if (p === 'local') state.ui.email = '';
  localStorage.setItem('fynpet_profile', p);
  Object.assign(state, loadProfileData(p));
  rerenderCurrentPage();
}

// Signed out or offline: show device-only data (an account's cache stays until sign-out).
function showLocalProfile() {
  if (activeProfile !== 'local') switchProfile('local');
}

async function onSignedIn(session) {
  closeModal('auth-modal');
  const userId = session.user.id;
  state.ui.email = session.user.email || '';
  if (activeProfile !== userId) {
    const local = activeProfile === 'local' ? loadProfileData('local') : null;
    switchProfile(userId);
    const nTx = local?.transactions.length || 0, nB = local?.budgets.length || 0;
    if ((nTx || nB) && confirm(`This device has ${nTx} transaction${nTx === 1 ? '' : 's'} and ${nB} budget${nB === 1 ? '' : 's'} that are not in an account.\n\nAdd them to ${session.user.email}?`)) {
      const merge = (mine, theirs) => [...mine, ...theirs.filter(t => !mine.some(m => m.id === t.id))];
      const pending = list => list.map(r => ({ ...r, dirty: true }));
      state.transactions = merge(state.transactions, pending(local.transactions));
      state.budgets = merge(state.budgets, pending(local.budgets.filter(b => !state.budgets.some(x => x.category === b.category))));
      state.imports = merge(state.imports, local.imports);
      Store.set('transactions', state.transactions); Store.set('budgets', state.budgets); Store.set('imports', state.imports);
      Store.clear('local');
      rerenderCurrentPage();
    }
  }
  const name = session.user.email?.split('@')[0] || 'User';
  setSyncStatus('syncing', `Syncing as ${name}…`);
  syncNow();
}

function rerenderCurrentPage() {
  renderAll();
  const id = document.querySelector('.page.on')?.id?.replace('page-', '');
  if (id === 'transactions') renderTxPage();
  if (id === 'budgets') renderBudgetsPage();
  if (id === 'analytics') renderAnalytics();
  if (id === 'mpesa') renderImportHistory();
}

// ═══════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════
function saveConfig(key,val){
  if(key.startsWith('rate_') && (!Number.isFinite(Number(val)) || Number(val)<=0)) {
    showToast('Enter an exchange rate greater than zero','error'); return;
  }
  CFG.set(key,val);
}
function saveAllConfig(){
  CFG.set('name',document.getElementById('cfg-name').value.trim()||'You');
  CFG.set('fireTarget',parseFloat(document.getElementById('cfg-fire').value)||3000000);
  document.getElementById('tb-name').textContent=CFG.get('name');
  document.getElementById('tb-av').textContent=CFG.get('name').charAt(0).toUpperCase();
  showToast('Profile saved','success');
}
function toggleKeyVis(inputId,btn){
  const inp=document.getElementById(inputId);
  inp.type=inp.type==='password'?'text':'password';
  btn.textContent=inp.type==='password'?'Show':'Hide';
  btn.setAttribute('aria-pressed',String(inp.type!=='password'));
}

// ═══════════════════════════════════════════════════════════
// EXPORT CSV
// ═══════════════════════════════════════════════════════════
function exportCSV(){
  if(!state.transactions.length){showToast('No transactions to export','info');return}
  const hdr=['Date','Description','Category','Type','Amount','Currency','Amount (KES)','Source','Notes'];
  const rows=state.transactions.map(t=>[t.date,csvText(t.description),t.category,t.type,t.amount,t.currency||'KES',txAmountKes(t).toFixed(2),t.source,csvText(t.notes)]);
  const csv=[hdr,...rows].map(csvRow).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`fynpet-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  showToast('CSV exported','success');
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
function toggleMobSidebar(){
  const sidebar=document.getElementById('sidebar');
  sidebar.classList.toggle('mob-open');
  sidebar.inert=!sidebar.classList.contains('mob-open')&&matchMedia('(max-width:768px)').matches;
  document.getElementById('mob-overlay').classList.toggle('show');
}
function mobGoPage(id,el){
  document.querySelectorAll('.mn-item').forEach(i=>i.classList.remove('on'));
  el.classList.add('on');
  // close drawer if open
  document.getElementById('sidebar').classList.remove('mob-open');
  document.getElementById('mob-overlay').classList.remove('show');
  goPage(id, null);
}

function goPage(id,navEl){
  document.getElementById('sidebar').classList.remove('mob-open');
  document.getElementById('sidebar').inert=matchMedia('(max-width:768px)').matches;
  document.getElementById('mob-overlay').classList.remove('show');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
  document.getElementById('page-'+id)?.classList.add('on');
  if(navEl)navEl.classList.add('on');
  document.querySelectorAll('.sb-nav .ni').forEach(el=>{
    const active=readArgs(el,'click')[0]===id;
    el.classList.toggle('on',active);
    if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
  });
  // Sync mobile bottom nav highlight
  document.querySelectorAll('.mn-item').forEach(mn=>{
    const mnPage=readArgs(mn,'click')[0];
    const active=mnPage===id||(mnPage==='more'&&['analytics','mpesa','settings'].includes(id));
    mn.classList.toggle('on',active);
    if(active)mn.setAttribute('aria-current','page');else mn.removeAttribute('aria-current');
  });
  applyPageTitle();
  document.body.dataset.page=id;
  if(id==='transactions'){
    if(_keepTxFilters)_keepTxFilters=false;else resetTxFilters();
    renderTxPage();
  }
  if(id==='dashboard')renderDashboard();
  if(id==='more')renderMore();
  if(id==='budgets')renderBudgetsPage();
  if(id==='analytics')renderAnalytics();
  if(id==='mpesa')renderImportHistory();
  if(id==='settings')loadSettingsPage();
  document.getElementById('content').scrollTop=0;
}

function loadSettingsPage() {
  // Populate profile, FIRE, and exchange rate fields
  [['cfg-name','name'],['cfg-fire','fireTarget'],
   ['cfg-rate-usd','rate_USD'],['cfg-rate-eur','rate_EUR'],['cfg-rate-gbp','rate_GBP'],['cfg-rate-tzs','rate_TZS'],['cfg-rate-ugx','rate_UGX']
  ].forEach(([id,key]) => {
    const el = document.getElementById(id);
    if (el) { const v = CFG.get(key); if (v) el.value = v; }
  });
  // Reflect current cloud connection state
  const cfg = window._cloudConfig;
  updateCloudStatus('claude', cfg?.aiEnabled ? true : false, cfg?.aiEnabled ? '✓ Ready (sign in to use)' : '✕ Not configured');
  const publicKey = cfg?.supabasePublicKey || cfg?.supabaseAnonKey;
  updateCloudStatus('sb', Boolean(cfg?.supabaseUrl && publicKey), cfg?.supabaseUrl && publicKey ? 'Available — sign in to sync' : 'Not available in this environment');
}


// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function openModal(id){
  const overlay=document.getElementById(id);
  overlay._opener=document.activeElement;
  overlay.classList.add('open');
  document.getElementById('layout').inert=true;
  document.getElementById('mob-nav').inert=true;
  const dialog=overlay.querySelector('.modal');
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
  const title=dialog.querySelector('.modal-title,.cm-title');
  if(title){if(!title.id)title.id=id+'-title';dialog.setAttribute('aria-labelledby',title.id);}
  dialog.tabIndex=-1;dialog.focus();
}
function closeModal(id){
  const overlay=document.getElementById(id);
  overlay.classList.remove('open');
  if(!document.querySelector('.modal-overlay.open')){
    document.getElementById('layout').inert=false;
    document.getElementById('mob-nav').inert=false;
  }
  overlay._opener?.focus();
  // Dismissing the consent dialog (Escape / backdrop) counts as "Not now".
  if(id==='ai-consent-modal'&&_consentResolve){_consentResolve(false);_consentResolve=null;}
}
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));
document.addEventListener('keydown',e=>{
  const overlay=[...document.querySelectorAll('.modal-overlay.open')].at(-1);
  if(e.key==='Escape'){
    if(overlay)closeModal(overlay.id);else if(state.ui.advisorOpen)toggleAdvisor();
  }
  if(e.key==='Tab'&&overlay){
    const items=[...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length&&!el.hidden);
    const first=items[0],last=items.at(-1);
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===overlay.querySelector('.modal'))){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }
});
function revokeAiConsent(){localStorage.removeItem('fynpet_cfg_aiConsent');showToast('AI consent turned off. You will be asked before the next AI request.','info');}

let _toastTimer=null;
let _toastAction = null;
function showToast(msg,type='success',opts={}){
  const t=document.getElementById('toast');const icons={success:'✓',error:'✕',info:'ℹ'};
  t.className='show '+type;document.getElementById('ti').textContent=icons[type]||'✓';document.getElementById('tm').textContent=msg;
  const btn=document.getElementById('toast-action');
  if(opts.action){btn.textContent=opts.action.label;btn.hidden=false;_toastAction=opts.action.run}else{btn.hidden=true;_toastAction=null}
  if(_toastTimer)clearTimeout(_toastTimer);_toastTimer=setTimeout(()=>{t.classList.remove('show');_toastAction=null},opts.action?7000:3200);
}
function toastAction(){const run=_toastAction;_toastAction=null;document.getElementById('toast').classList.remove('show');run?.()}

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}
function escHtml(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}

// ═══════════════════════════════════════════════════════════
// EVENT DISPATCH (no inline handlers — required for the CSP)
// Markup declares   data-click="action"  data-click-args='["x","$el"]'
// Arg tokens: "$el" element · "$event" event · "$value" el.value ·
//             "$float:N" parseFloat(el.value)||N
// Only functions listed in ACTIONS can be triggered from markup.
// ═══════════════════════════════════════════════════════════
function argsAttr(args){return escHtml(JSON.stringify(args))}
function readArgs(el,type){
  try{return JSON.parse(el.getAttribute(`data-${type}-args`)||'[]')}catch{return[]}
}

function confirmSignOut(){if(confirm('Sign out?'))signOut()}
function clearLocalData(){if(confirm('Clear ALL local data on this device? Data synced to your account is not affected.')){localStorage.clear();location.reload()}}
function submitOnEnter(e){if(e.key==='Enter')submitAuth()}

const ACTIONS = {
  syncNow: () => syncNow({ interactive: true }),
  answerAiConsent, autoResize, choosePdf, clearFile, clearLocalData, closeModal, confirmDel, confirmSignOut, dzDrag, dzDrop, openModal, revokeAiConsent,
  dismissSyncBanner, exportCSV, setTxType, toggleMoreTypes, setTxCat, toggleCatSelect, toggleTxDetails, txAmountInput, txDescInput, txCurrencyChanged, txEnterSaves, toastAction, openAddChoice, chooseAdd, openTxDetail, detailEdit, detailDelete, openTxMenu, openTxFilters, txQuickRange, txResetFilters, txApplyFilters, txClearAll, txRemoveCat, txRemoveDates, txLoadMore, openBudgetMenu, baEdit, baDelete, openRaiseLimit, saveRaise, raiseInput, raiseEnter, viewBudgetTx, budgetCatChanged, budgetLimitInput, budgetEnter, useLastMonth, impCancel, impBack, impToggleRow, impSetCategory, impSave, impReset, impRetry, goPage, handleAdvisorKey, handlePDF, mobGoPage, openAddBudget, openAddTx, openEditBudget,
  openEditTx, recheckCloudConfig, replayHistory, runAiAnalysis, runImport, saveAllConfig, saveBudget,
  saveConfig, saveTx, searchTx, searchGlobalTx, sendAdvisorMessage, sendQuick, setAdvTab, setAuthTab, setChartPeriod,
  setTxFilter, setTxPage, skipAuth, submitAuth, submitOnEnter, toggleAdvisor,
  toggleMobSidebar, toggleKeyVis,
};

['click','input','change','keydown','dragover','dragleave','drop'].forEach(type=>{
  document.addEventListener(type,e=>{
    const el=e.target.closest?.(`[data-${type}]`);
    if(!el)return;
    const fn=ACTIONS[el.getAttribute(`data-${type}`)];
    if(!fn)return;
    const args=readArgs(el,type).map(a=>{
      if(a==='$el')return el;
      if(a==='$event')return e;
      if(a==='$value')return el.value;
      if(typeof a==='string'&&a.startsWith('$float:'))return parseFloat(el.value)||parseFloat(a.slice(7));
      return a;
    });
    fn(...args);
  });
});
function delay(ms){return new Promise(r=>setTimeout(r,ms))}

let _resizeTimer;window.addEventListener('resize',()=>{clearTimeout(_resizeTimer);_resizeTimer=setTimeout(()=>{drawMainChart(_chartPeriod);drawTrendChart?.()},120)})

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  renderIcons();
  document.getElementById('advisor-panel').inert=true;
  document.getElementById('advisor-panel').setAttribute('aria-hidden','true');
  document.querySelectorAll('.page .ph-title').forEach(el=>{el.setAttribute('role','heading');el.setAttribute('aria-level','1');});
  document.querySelectorAll('.form-grp').forEach(group=>{
    const control=group.querySelector('input,select,textarea');const label=group.querySelector('.form-lbl');
    if(control&&label&&!control.labels?.length)control.setAttribute('aria-label',label.textContent.trim());
  });
  const viewport=()=>{
    document.documentElement.style.setProperty('--viewport-height',(window.visualViewport?.height||window.innerHeight)+'px');
    document.documentElement.style.setProperty('--viewport-top',(window.visualViewport?.offsetTop||0)+'px');
    const sidebar=document.getElementById('sidebar');
    sidebar.inert=matchMedia('(max-width:768px)').matches&&!sidebar.classList.contains('mob-open');
    document.getElementById('main').inert=state.ui.advisorOpen&&matchMedia('(max-width:768px)').matches;
  };
  viewport();window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);window.addEventListener('resize',viewport);
  const now = new Date();
  const fmtDate = d => d.toLocaleDateString('en-KE',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  // Topbar date
  const tbDate = document.getElementById('tb-date-label');
  if (tbDate) tbDate.textContent = fmtDate(now);
  const dashSub = document.getElementById('dash-sub');
  if (dashSub) dashSub.textContent = fmtDate(now);

  // Date inputs default to today
  const txDateEl = document.getElementById('tx-date');
  if (txDateEl) txDateEl.value = nairobiDate(now);
  // Profile
  const name = CFG.get('name') || 'You';
  document.getElementById('tb-name').textContent = name;
  document.getElementById('tb-av').textContent = name.charAt(0).toUpperCase();

  // Advisor panel: closed by default (overlay model — user opens it)
  state.ui.advisorOpen = false;

  // Main render
  const dash = document.getElementById('page-dashboard');
  dash.dataset.intro = '1'; setTimeout(() => delete dash.dataset.intro, 1800);
  wireChart(); wireRowMenu();
  document.body.dataset.page = 'dashboard';
  applyPageTitle(); matchMedia('(max-width:768px)').addEventListener('change', applyPageTitle);
  renderAll();

  // Fetch config (Supabase URL/key, AI readiness) from the Netlify function on boot
  initCloudConfig();

  // Prime the advisor welcome message (no API call — just a greeting)
  const ctx = buildFinancialContext();
  const hasData = ctx.summary.totalTransactions > 0;
  let welcomeMsg;
  if (hasData) {
    welcomeMsg = `Hi **${ctx.userName}**!  I have your financial data loaded — **${ctx.summary.totalTransactions} transactions** on record.\n\nThis month: Income **KES ${ctx.summary.thisMonth.income.toLocaleString()}**, Expenses **KES ${ctx.summary.thisMonth.expenses.toLocaleString()}**, Savings rate **${ctx.summary.thisMonth.savingsRate}**.\n\nAsk me anything or tap a quick prompt below.`;
  } else {
    welcomeMsg = `Hi **${ctx.userName}**!  I'm Fyn, your AI financial advisor.\n\nNo transactions yet. Add some manually or **import your M-Pesa statement** to get started. Once you have data, I'll give you personalised financial advice.`;
  }
  appendMsg('ai', welcomeMsg);
});
