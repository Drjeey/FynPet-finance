import { DEFAULT_RATES, convertToKes, amountKes, sumKes, categoryTotals, nairobiDate, monthKey, periodBounds, periodStats, chartSeries, emergencyFundMonths } from './calc.js';

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
    if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
      sbClient = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
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
    updateCloudStatus('sb', cfg.supabaseUrl ? true : false,
      cfg.supabaseUrl ? '✓ Configured' : '⚠ SUPABASE_URL not set in Netlify');
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
const DATA_KEYS = ['transactions', 'budgets', 'imports', 'advisor_history'];
let activeProfile = localStorage.getItem('fynpet_profile') || 'local';
function storeKey(k, p = activeProfile) { return p === 'local' ? 'fynpet_' + k : `fynpet_u_${p}_${k}`; }
const Store = {
  get: (k, p) => { try { return JSON.parse(localStorage.getItem(storeKey(k, p))) || [] } catch { return [] } },
  set: (k, v, p) => localStorage.setItem(storeKey(k, p), JSON.stringify(v)),
  clear: p => DATA_KEYS.forEach(k => localStorage.removeItem(storeKey(k, p))),
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
  return {
    id: safeId(t.id) || uid(),
    description: String(t.description || '').trim().slice(0, 300) || '(no description)',
    amount, date, amountKes: amountKes({ ...t, amount, currency: CURRENCIES.includes(currency) ? currency : 'KES' }, exchangeRates()),
    type: TX_TYPES.includes(t.type) ? t.type : 'expense',
    category: CAT_KEYS.includes(t.category) ? t.category : 'other',
    currency: CURRENCIES.includes(currency) ? currency : 'KES',
    notes: String(t.notes || '').slice(0, 500),
    source: SOURCES.includes(t.source) ? t.source : 'manual',
    createdAt: isoTime(t.createdAt) || new Date().toISOString(),
    ...(safeId(t.importBatch) ? { importBatch: t.importBatch } : {}),
    ...(/^[A-Z0-9]{8,12}$/.test(t.externalRef || '') ? { externalRef: t.externalRef } : {}),
  };
}
function normalizeBudget(b) {
  const limit = Number(b?.limit);
  if (!b || !CAT_KEYS.includes(b.category) || !Number.isFinite(limit) || limit <= 0) return null;
  return { id: safeId(b.id) || uid(), category: b.category, limit, period: 'monthly' };
}
function normalizeImport(i) {
  if (!i || typeof i !== 'object') return null;
  return { id: safeId(i.id) || uid(), filename: String(i.filename || 'statement.pdf').slice(0, 200),
    count: Math.max(0, parseInt(i.count, 10) || 0), date: isoTime(i.date) || new Date().toISOString(),
    status: ['success', 'partial', 'failed'].includes(i.status) ? i.status : 'success' };
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
  };
  // Persist the cleaned records so replaced IDs stay stable across reloads.
  Store.set('transactions', data.transactions, p); Store.set('budgets', data.budgets, p);
  Store.set('imports', data.imports, p); Store.set('advisor_history', data.advisorHistory, p);
  return data;
}

// ── SUPABASE CLIENT ────────────────────────────────────────
let sbClient = null;
function getSbClient() {
  if (sbClient) return sbClient;
  const cfg = window._cloudConfig;
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) return null;
  sbClient = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  return sbClient;
}

// ── STATE ─────────────────────────────────────────────────
const state = {
  ...loadProfileData(),
  ui: { txFilter: 'all', txSearch: '', txPage: 1, perPage: 12, editTxId: null, editBudgetId: null, advisorOpen: true, advisorTab: 'chat' },
  pendingDel: { type: null, id: null },
  selectedFile: null,
};

// ── CATEGORY META ─────────────────────────────────────────
const CATS = {
  food:          { icon:'◆', label:'Food & Groceries',  color:'#D97706', bg:'#FFFBEB' },
  transport:     { icon:'◆', label:'Transport',          color:'#2563EB', bg:'#EFF6FF' },
  utilities:     { icon:'◆', label:'Utilities',          color:'#7C3AED', bg:'#F5F3FF' },
  entertainment: { icon:'◆', label:'Entertainment',      color:'#DB2777', bg:'#FDF2F8' },
  health:        { icon:'◆', label:'Health',             color:'#059669', bg:'#ECFDF5' },
  shopping:      { icon:'◆', label:'Shopping',           color:'#EA580C', bg:'#FFF7ED' },
  savings:       { icon:'◆', label:'Savings',            color:'#16A34A', bg:'#F0FDF4' },
  income:        { icon:'◆', label:'Income',             color:'#059669', bg:'#ECFDF5' },
  transfer:      { icon:'◆', label:'Transfer',           color:'#4338CA', bg:'#EEF2FF' },
  other:         { icon:'◆', label:'Other',              color:'#78716C', bg:'#F5F5F4' },
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
  if (state.ui.advisorOpen) {
    panel.classList.add('open');
    main.classList.add('panel-open');
    backdrop.classList.add('show');
  } else {
    panel.classList.remove('open');
    main.classList.remove('panel-open');
    backdrop.classList.remove('show');
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
  const userName = CFG.get('name') ? CFG.get('name').charAt(0).toUpperCase() : 'J';
  if (isTyping) {
    div.id = 'typing-msg';
    div.innerHTML = `<div class="msg-av ai" style="font-family:var(--fm);font-size:.6rem">Ai</div><div class="msg-bubble ai"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  } else if (role === 'ai') {
    div.innerHTML = `<div class="msg-av ai" style="font-family:var(--fm);font-size:.6rem">Ai</div><div><div class="msg-bubble ai">${formatMsg(text)}</div><div class="msg-time">${time}</div></div>`;
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
          <div style="font-family:var(--fm);font-size:.55rem;font-weight:700;color:${sc.color};background:${sc.bg};border-radius:4px;padding:3px 5px;flex-shrink:0;min-width:28px;text-align:center">${f.label}</div>
          <div class="imc-info"><div class="imc-name">${f.name}</div><div class="imc-val ${f.status}">${f.val}</div><div class="imc-sub">${f.sub}</div></div>
          <div class="imc-status" style="background:${sc.bg};color:${sc.color};font-family:var(--fm);font-size:.58rem">${sc.label}</div>
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
        <div style="font-family:var(--fm);font-size:.55rem;font-weight:700;color:${m.color};background:${m.color}18;border-radius:4px;padding:3px 5px;flex-shrink:0;min-width:28px;text-align:center">${m.label}</div>
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
function setSyncStatus(status, label) {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-label');
  dot.className = 'sync-dot ' + status;
  lbl.textContent = label;
}

async function connectSupabase() {
  await recheckCloudConfig();
}

async function syncNow() {
  const sb = getSbClient();
  if (!sb) { setSyncStatus('local', 'Local only'); return; }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { openModal('auth-modal'); setSyncStatus('local', 'Sign in to sync'); return; }
  setSyncStatus('syncing', 'Syncing…');
  try {
    await pushToSupabase(sb, session.user.id);
    await pullFromSupabase(sb);
    setSyncStatus('connected', `Synced ${new Date().toLocaleTimeString()}`);
  } catch(e) {
    setSyncStatus('error', 'Sync failed: ' + e.message.slice(0,30));
    console.error('Sync error:', e);
  }
}

async function pushToSupabase(sb, userId) {
  if (state.transactions.length > 0) {
    const rows = state.transactions.map(t => ({
      id: t.id, user_id: userId,
      description: t.description, amount: t.amount,
      type: t.type, category: t.category,
      date: t.date, notes: t.notes||null,
      currency: t.currency||'KES', amount_kes: txAmountKes(t),
      external_ref: t.externalRef||null, import_batch: t.importBatch||null,
      source: t.source||'manual', created_at: t.createdAt||new Date().toISOString()
    }));
    const { error } = await sb.from('transactions').upsert(rows, { onConflict: 'user_id,id' });
    if (error && error.code !== '42P01') throw error;
  }
  if (state.budgets.length > 0) {
    const bRows = state.budgets.map(b => ({ id: b.id, user_id: userId, category: b.category, monthly_limit: b.limit, period: b.period||'monthly' }));
    const { error } = await sb.from('budgets').upsert(bRows, { onConflict: 'user_id,id' });
    if (error && error.code !== '42P01') throw error;
  }
  if (state.advisorHistory.length > 0) {
    const ahRows = state.advisorHistory.map(h => ({ id: h.id, user_id: userId, prompt: h.prompt, response: h.response, created_at: h.timestamp }));
    const { error } = await sb.from('advisor_history').upsert(ahRows, { onConflict: 'user_id,id' });
    if (error && error.code !== '42P01') throw error;
  }
}

async function pullFromSupabase(sb) {
  const { data: txData, error: txErr } = await sb.from('transactions').select('*').order('date', { ascending: false });
  if (!txErr && txData) {
    const localIds = new Set(state.transactions.map(t=>t.id));
    const newRemote = normalizeList(txData.filter(t=>!localIds.has(t.id)).map(t=>({
      id: t.id, description: t.description, amount: t.amount,
      type: t.type, category: t.category, date: t.date, currency: t.currency, amountKes: t.amount_kes,
      notes: t.notes||'', source: t.source||'synced', createdAt: t.created_at,
      externalRef: t.external_ref || undefined
    })), normalizeTx);
    if (newRemote.length > 0) {
      state.transactions.push(...newRemote);
      Store.set('transactions', state.transactions);
      renderAll();
    }
  }
  const { data: bData, error: bErr } = await sb.from('budgets').select('*');
  if (!bErr && bData) {
    const localBIds = new Set(state.budgets.map(b=>b.id));
    bData.filter(b=>!localBIds.has(b.id)).forEach(b => {
      const nb = normalizeBudget({ id:b.id, category:b.category, limit:b.monthly_limit });
      if (nb) state.budgets.push(nb);
    });
    Store.set('budgets', state.budgets);
  }
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
  renderStatCards(_chartPeriod);
  drawMainChart(_chartPeriod);
  drawDonutChart(_chartPeriod);
  renderRecentTx();
  renderBudgetStatus(_chartPeriod);
  renderGamification();
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
    <div class="tt"><div class="tt-title">Milestones</div><div style="font-size:.63rem;color:var(--ink3);font-family:var(--fm)">${earned}/${badges.length} earned</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--border)">
      <div style="padding:14px 18px;border-right:1px solid var(--border)">
        <div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;font-weight:600;color:var(--ink3);margin-bottom:6px">Savings Streak</div>
        <div style="font-family:var(--fm);font-size:1.8rem;font-weight:600;color:${streak>0?'var(--teal)':'var(--ink3)'};line-height:1">${streak}<span style="font-size:.75rem;font-weight:400;margin-left:4px">mo</span></div>
        <div style="font-size:.61rem;color:var(--ink3);margin-top:4px">${streak>=3?'Outstanding!':streak>=1?'Keep going!':'Start saving this month'}</div>
      </div>
      <div style="padding:14px 18px">
        <div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;font-weight:600;color:var(--ink3);margin-bottom:6px">vs Last Month</div>
        <div style="font-family:var(--fm);font-size:1.8rem;font-weight:600;color:${spendColor};line-height:1">${spendDiff!==null?(parseFloat(spendDiff)>0?'+':'')+spendDiff+'%':'—'}</div>
        <div style="font-size:.61rem;color:var(--ink3);margin-top:4px">${spendDiff!==null?spendArrow+' than last month':'No prior data'}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:14px 18px">
      ${badges.map(b=>`<div style="text-align:center;padding:10px 4px;border-radius:8px;background:${b.done?'var(--bluelt)':'var(--surface2)'};border:1px solid ${b.done?'rgba(55,48,163,.2)':'var(--border)'};transition:all .2s" title="${b.desc}">
        <div style="font-size:1rem;margin-bottom:4px;opacity:${b.done?1:.3}">${b.icon}</div>
        <div style="font-size:.6rem;font-weight:700;color:${b.done?'var(--blue)':'var(--ink3)'};margin-bottom:1px;line-height:1.2">${b.lbl}</div>
        <div style="font-size:.54rem;color:var(--ink3);line-height:1.2">${b.desc}</div>
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

function renderStatCards(period = 'month') {
  const s = getStats(period);
  const fmt = n => n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : n.toString();
  const cards = [
    {
      icon:'↑', iconBg:'var(--teallt)', iconColor:'var(--teal)',
      lbl:'Total Income', val:`KES ${fmt(s.income)}`,
      sub: s.label,
      badge: parseFloat(s.incChg) >= 0 ? `+${s.incChg}%` : `${s.incChg}%`,
      bt: parseFloat(s.incChg) >= 0 ? 'up' : 'dn',
      accent:'var(--teal)',
    },
    {
      icon:'↓', iconBg:'var(--roselt)', iconColor:'var(--rose)',
      lbl:'Total Expenses', val:`KES ${fmt(s.exp)}`,
      sub: s.label,
      badge: parseFloat(s.expChg) >= 0 ? `+${s.expChg}%` : `${s.expChg}%`,
      bt: parseFloat(s.expChg) <= 0 ? 'up' : 'dn',
      accent:'var(--rose)',
    },
    {
      icon:'◈', iconBg:'var(--bluelt)', iconColor:'var(--blue)',
      lbl:'Total Saved', val:`KES ${fmt(s.totalSaved)}`,
      sub:'All time',
      badge: `${s.savingsRate}% rate`,
      bt: parseFloat(s.savingsRate) >= 20 ? 'up' : 'dn',
      accent:'var(--blue)',
    },
    {
      icon:'#', iconBg:'var(--purplt)', iconColor:'var(--purple)',
      lbl:'Transactions', val: s.txCount.toString(),
      sub:`${state.transactions.length} total recorded`,
      badge:`${s.txCount} in period`,
      bt:'up',
      accent:'var(--purple)',
    },
  ];
  document.getElementById('stat-cards').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="sc-top">
        <div class="sc-ic" style="background:${c.iconBg};color:${c.iconColor};font-family:var(--fm);font-weight:700;font-size:1.1rem">${c.icon}</div>
        <div class="sc-badge ${c.bt}">${c.badge}</div>
      </div>
      <div class="sc-lbl">${c.lbl}</div>
      <div class="sc-val">${c.val}</div>
      <div class="sc-sub">${c.sub}</div>
      <div class="sc-accent" style="background:${c.accent}"></div>
    </div>`).join('');
}

function renderBudgetStatus(period = 'month') {
  const card = document.getElementById('budget-status-card');
  const el   = document.getElementById('budget-status-bars');
  const lbl  = document.getElementById('budget-status-period');
  if (!card || !el) return;
  if (!state.budgets.length) { card.style.display = 'none'; return; }
  card.style.display = '';
  if (lbl) lbl.textContent = '— ' + (_periodLabel[period]||'this month').toLowerCase();
  const pf = _periodFilter(period);
  const rows = state.budgets
    .map(b => {
      const spent = totalKes(state.transactions.filter(pf), { category: b.category, type: 'expense' });
      return { b, spent };
    })
    .sort((a,b) => (b.spent/b.b.limit) - (a.spent/a.b.limit));
  el.innerHTML = rows.map(({b, spent}) => {
    const pct = b.limit > 0 ? Math.min((spent/b.limit)*100, 100) : 0;
    const pctNum = Math.round(pct);
    const color = pct >= 90 ? 'var(--rose)' : pct >= 70 ? 'var(--amber)' : 'var(--teal)';
    const cc = CATS[b.category] || CATS.other;
    const remaining = Math.max(b.limit - spent, 0);
    return `<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border)">
      <div style="width:7px;height:7px;border-radius:50%;background:${cc.color};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;align-items:baseline">
          <div style="font-size:.72rem;font-weight:600;color:var(--ink)">${cc.label}</div>
          <div style="font-size:.62rem;font-family:var(--fm);color:${color};font-weight:700">${pctNum}% · <span style="color:var(--ink3)">KES ${spent.toLocaleString()} / ${b.limit.toLocaleString()}</span></div>
        </div>
        <div style="height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
          <div style="height:100%;border-radius:2px;width:${pct}%;background:${color};transition:width .6s ease"></div>
        </div>
        <div style="font-size:.6rem;color:var(--ink3);margin-top:3px">${pct<100?`KES ${remaining.toLocaleString()} remaining`:'Over budget'}</div>
      </div>
    </div>`;
  }).join('');
}

// ─── Canvas Charts ─────────────────────────────────────────
let _chartPeriod = 'week';
function drawMainChart(period) {
  _chartPeriod = period;
  const c = document.getElementById('main-canvas'); if(!c) return;
  const dpr=window.devicePixelRatio||1;
  c.width=c.offsetWidth*dpr; c.height=130*dpr;
  const ctx=c.getContext('2d'); ctx.scale(dpr,dpr);
  const W=c.offsetWidth, H=130;
  ctx.clearRect(0,0,W,H);
  const { labels, income: incD, expenses: expD } = chartSeries(state.transactions, period, new Date(), exchangeRates());
  if([...incD,...expD].every(v=>v===0)){
    ctx.fillStyle='#A8A29E';ctx.textAlign='center';ctx.font=`12px DM Sans`;
    ctx.fillText('No data yet — add transactions to see your chart',W/2,H/2);return;
  }
  const maxV=Math.max(...incD,...expD,1);
  const pL=8,pR=8,pT=14,pB=20,cW=W-pL-pR,cH=H-pT-pB;
  const bw=(cW/labels.length)*0.32,gap=cW/labels.length;
  ctx.strokeStyle='rgba(28,25,23,.05)';ctx.lineWidth=1;
  for(let i=0;i<=3;i++){const y=pT+cH*(1-i/3);ctx.beginPath();ctx.moveTo(pL,y);ctx.lineTo(W-pR,y);ctx.stroke()}
  labels.forEach((l,i)=>{
    const cx=pL+i*gap+gap/2;
    const ih=(incD[i]/maxV)*cH,eh=(expD[i]/maxV)*cH;
    const rr=(x,y,w,h,r,cl)=>{if(h<=0)return;ctx.fillStyle=cl;ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.arcTo(x,y+h,x,y+h,0);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();ctx.fill()};
    rr(cx-bw-2,pT+cH-ih,bw,ih,3,'rgba(55,48,163,.75)');
    rr(cx+2,pT+cH-eh,bw,eh,3,'rgba(220,38,38,.62)');
    ctx.fillStyle='#A8A29E';ctx.textAlign='center';ctx.font=`9px IBM Plex Mono`;
    ctx.fillText(l,cx,H-5);
  });
}

function setChartPeriod(btn,p){
  document.querySelectorAll('.pb').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  drawMainChart(p);
  renderStatCards(p);
  drawDonutChart(p);
  renderBudgetStatus(p);
}

function drawDonutChart(period = 'month'){
  const c=document.getElementById('donut-canvas');if(!c)return;
  const ctx=c.getContext('2d');c.width=110;c.height=110;ctx.clearRect(0,0,110,110);
  const sub = document.getElementById('donut-period-sub');
  if(sub) sub.textContent = (_periodLabel[period]||'This month') + "'s breakdown";
  const pf = _periodFilter(period);
  const exp=state.transactions.filter(t=>t.type==='expense'&&pf(t));
  const cats=categoryTotals(exp, {}, exchangeRates());
  const entries=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  const total=totalKes(exp);
  if(!entries.length){
    ctx.strokeStyle='#e8eaf2';ctx.lineWidth=12;ctx.beginPath();ctx.arc(55,55,42,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#A8A29E';ctx.textAlign='center';ctx.font='10px DM Sans';ctx.fillText('No data',55,59);
    document.getElementById('donut-legend').innerHTML='<div style="font-size:.68rem;color:var(--ink3);text-align:center;padding:8px">No expense data</div>';return;
  }
  let sa=-Math.PI/2;
  entries.forEach(([cat,v])=>{
    const sl=(v/total)*Math.PI*2;
    ctx.beginPath();ctx.moveTo(55,55);ctx.arc(55,55,50,sa,sa+sl);ctx.closePath();
    ctx.fillStyle=CATS[cat]?.color||'#78716C';ctx.fill();sa+=sl;
  });
  // White center hole
  ctx.beginPath();ctx.arc(55,55,32,0,Math.PI*2);
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()||'#FDFCFA';
  ctx.fill();
  // Center text
  ctx.fillStyle='#1C1917';ctx.textAlign='center';
  ctx.font='500 9px IBM Plex Mono';
  ctx.fillText('KES',55,51);
  ctx.font='600 11px IBM Plex Mono';
  ctx.fillText(total>=1000000?(total/1000000).toFixed(1)+'M':total>=1000?(total/1000).toFixed(0)+'K':total,55,66);
  document.getElementById('donut-legend').innerHTML=entries.map(([cat,v])=>{
    const pct=((v/total)*100).toFixed(0);const cc=CATS[cat]||CATS.other;
    return `<div class="dl-row"><div class="dl-l"><div class="dl-dot" style="background:${cc.color}"></div>${cc.label}</div><div style="display:flex;align-items:center;gap:6px"><div class="dl-r">KES ${v.toLocaleString()}</div><div style="font-size:.58rem;font-weight:700;padding:1px 6px;border-radius:3px;background:${cc.bg};color:${cc.color};font-family:var(--fm)">${pct}%</div></div></div>`;
  }).join('');
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
  const srcClass=tx.source==='ai'?'ai':tx.source==='import'?'import':'manual';
  const cur=tx.currency&&tx.currency!=='KES'?tx.currency:'KES';
  const amtDisplay=cur==='KES'?`${amtSign}KES ${tx.amount.toLocaleString()}`:`${amtSign}${cur} ${tx.amount.toLocaleString()} <span style="font-size:.58rem;color:var(--ink3);font-weight:400">≈ KES ${txAmountKes(tx).toLocaleString()}</span>`;
  return `<tr>
    <td><div style="display:flex;align-items:center;gap:10px">
      <div class="td-ico" style="background:${c.bg};position:relative;overflow:hidden">
        <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${c.color};border-radius:0"></div>
      </div>
      <div><div class="td-main">${escHtml(tx.description)}</div><div class="td-sub">${escHtml(tx.date)}</div></div>
    </div></td>
    <td><div class="cat-pill" style="background:${c.bg};color:${c.color};font-family:var(--fm)">${c.label}</div></td>
    <td><div class="td-mono ${amtClass}">${amtDisplay}</div></td>
    <td><div class="st-pill ${srcClass}">${srcLabel}</div></td>
    ${actions?`<td><div class="row-acts">
      <div class="ra" data-click="openEditTx" data-click-args="${argsAttr([tx.id])}" title="Edit" style="font-size:.9rem">✎</div>
      <div class="ra del" data-click="confirmDel" data-click-args="${argsAttr(['tx',tx.id])}" title="Delete" style="font-size:.9rem">×</div>
    </div></td>`:''}
  </tr>`;
}

function renderRecentTx(){
  const el=document.getElementById('recent-tx');if(!el)return;
  const recent=[...state.transactions].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
  if(!recent.length){el.innerHTML=`<div class="empty"><div class="empty-icon" style="font-family:var(--fm);font-size:1.8rem;color:var(--ink3)">—</div><div class="empty-title">No transactions yet</div><div class="empty-sub">Add your first transaction or import an M-Pesa statement.</div><button class="btn-primary" data-click="openAddTx">+ Add Transaction</button></div>`;return}
  el.innerHTML=`<table><thead><tr><th>Transaction</th><th>Category</th><th>Amount</th><th>Source</th><th>Actions</th></tr></thead><tbody>${recent.map(t=>txRow(t)).join('')}</tbody></table>`;
}

function renderTxPage(){
  let filtered=[...state.transactions].sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(state.ui.txFilter!=='all')filtered=filtered.filter(t=>t.type===state.ui.txFilter);
  if(state.ui.txSearch){const q=state.ui.txSearch.toLowerCase();filtered=filtered.filter(t=>(t.description||'').toLowerCase().includes(q)||(t.category||'').toLowerCase().includes(q))}
  const allCount=state.transactions.length;
  document.getElementById('tx-count-sub').textContent=(state.ui.txFilter==='all'&&!state.ui.txSearch)?`${allCount} transaction${allCount!==1?'s':''}` : `${filtered.length} of ${allCount} shown`;
  const{txPage,perPage}=state.ui,total=filtered.length,pages=Math.max(1,Math.ceil(total/perPage));
  const start=(txPage-1)*perPage,end=Math.min(start+perPage,total),paged=filtered.slice(start,end);
  const el=document.getElementById('full-tx-table');
  const _emptyMsg=state.ui.txFilter!=='all'?`No ${state.ui.txFilter} transactions found.`:state.ui.txSearch?'Try a different search.':allCount>0?'All transactions loaded.':'Add your first transaction to get started.';
  const _clearBtn=state.ui.txFilter!=='all'?`<button class="btn-ghost" style="padding:3px 10px;font-size:.65rem;margin-top:10px" data-click="showAllTxTypes">Show all types</button>`:'';
  if(!paged.length){el.innerHTML=`<div class="empty"><div class="empty-icon" style="font-family:var(--fm);font-size:1.8rem;color:var(--ink3)">∅</div><div class="empty-title">No transactions found</div><div class="empty-sub">${_emptyMsg}${_clearBtn}</div></div>`;
  }else{el.innerHTML=`<table><thead><tr><th>Transaction</th><th>Category</th><th>Amount</th><th>Source</th><th>Actions</th></tr></thead><tbody>${paged.map(t=>txRow(t)).join('')}</tbody></table>`}
  document.getElementById('tx-pg-info').textContent=total>0?`Showing ${start+1}–${end} of ${total}`:'No results';
  document.getElementById('tx-pag').innerHTML=`<button class="pg" data-click="setTxPage" data-click-args='[${txPage-1}]' ${txPage<=1?'disabled':''}>‹</button>${Array.from({length:pages},(_,i)=>`<button class="pg ${txPage===i+1?'on':''}" data-click="setTxPage" data-click-args='[${i+1}]'>${i+1}</button>`).join('')}<button class="pg" data-click="setTxPage" data-click-args='[${txPage+1}]' ${txPage>=pages?'disabled':''}>›</button>`;
}

function setTxFilter(f,btn){state.ui.txFilter=f;state.ui.txPage=1;document.querySelectorAll('.fb').forEach(b=>b.classList.remove('on'));btn.classList.add('on');renderTxPage()}
function searchTx(q){state.ui.txSearch=q;state.ui.txPage=1;renderTxPage();renderRecentTx()}
function setTxPage(p){state.ui.txPage=p;renderTxPage()}

// ─── Budgets page ──────────────────────────────────────────
function renderBudgetsPage(){
  const now=new Date(),ms=monthKey(now);
  let tLim=0,tSpent=0,tOver=0;
  state.budgets.forEach(b=>{
    const s=totalKes(state.transactions.filter(t=>t.date?.startsWith(ms)&&t.category===b.category&&t.type==='expense'));
    tLim+=b.limit;tSpent+=s;if(s>b.limit)tOver++;
  });
  document.getElementById('budget-stats').innerHTML=[
    {icon:'$',ic:'var(--bluebg)',icColor:'var(--blue)',lbl:'Total Budget',val:`KES ${tLim.toLocaleString()}`,sub:'This month',badge:'Monthly',bt:'neutral',acc:'var(--blue)'},
    {icon:'↓',ic:'var(--rosebg)',icColor:'var(--rose)',lbl:'Total Spent',val:`KES ${tSpent.toLocaleString()}`,sub:tLim>0?`${((tSpent/tLim)*100).toFixed(0)}% of budget`:'No limit set',badge:`${tOver} over`,bt:tOver>0?'dn':'up',acc:'var(--rose)'},
    {icon:'↑',ic:'var(--tealbg)',icColor:'var(--teal)',lbl:'Remaining',val:`KES ${Math.max(0,tLim-tSpent).toLocaleString()}`,sub:'Available to spend',badge:tLim-tSpent>=0?'On track':'Over!',bt:tLim-tSpent>=0?'up':'dn',acc:'var(--teal)'},
  ].map(c=>`<div class="stat-card"><div class="sc-top"><div class="sc-ic" style="background:${c.ic};color:${c.icColor};font-family:var(--fm);font-weight:700;font-size:1.1rem">${c.icon}</div><div class="sc-badge ${c.bt}">${c.badge}</div></div><div class="sc-lbl">${c.lbl}</div><div class="sc-val">${c.val}</div><div class="sc-sub">${c.sub}</div><div class="sc-accent" style="background:${c.acc}"></div></div>`).join('');
  const grid=document.getElementById('budget-grid');
  if(!state.budgets.length){grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="empty-icon" style="font-family:var(--fm);font-size:1.8rem;color:var(--ink3)">◎</div><div class="empty-title">No budgets yet</div><div class="empty-sub">Create category budgets to track your spending limits.</div><button class="btn-primary" data-click="openAddBudget">+ Create Budget</button></div>`;return}
  grid.innerHTML=state.budgets.map(b=>{
    const s=totalKes(state.transactions.filter(t=>t.date?.startsWith(ms)&&t.category===b.category&&t.type==='expense'));
    const pct=Math.min((s/b.limit)*100,100),over=s>b.limit,left=b.limit-s;
    const cc=CATS[b.category]||CATS.other;
    return `<div class="bc ${over?'over-budget':''}">
      <div class="bc-hdr">
        <div class="bc-ic" style="background:${cc.bg};position:relative;overflow:hidden;flex-shrink:0">
          <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${cc.color}"></div>
          <span style="font-family:var(--fm);font-size:.65rem;font-weight:700;color:${cc.color};padding-left:6px">${cc.label.slice(0,2).toUpperCase()}</span>
        </div>
        <div><div class="bc-name">${cc.label}</div><div class="bc-lmt">KES ${b.limit.toLocaleString()}/month</div></div>
      </div>
      <div class="bc-amts"><div class="bc-spent ${over?'over':''}">KES ${s.toLocaleString()}</div><div class="bc-rem ${over?'bad':'ok'}">${over?'−KES '+Math.abs(left).toLocaleString()+' over':'+KES '+left.toLocaleString()+' left'}</div></div>
      <div class="bc-track"><div class="bc-fill" style="width:${pct}%;background:${over?'var(--rose)':cc.color}"></div></div>
      <div class="bc-meta"><span>${pct.toFixed(0)}% used</span><span>KES ${b.limit.toLocaleString()} limit</span></div>
      <div class="bc-acts"><button class="btn-secondary" style="flex:1;justify-content:center;font-size:.68rem;padding:6px" data-click="openEditBudget" data-click-args="${argsAttr([b.id])}">Edit</button><button class="btn-danger-sm" data-click="confirmDel" data-click-args="${argsAttr(['budget',b.id])}">Delete</button></div>
    </div>`;
  }).join('');
}

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
  if(months.every(v=>v===0)){ctx.fillStyle='#A8A29E';ctx.textAlign='center';ctx.font='12px DM Sans';ctx.fillText('Add savings transactions to see trend',W/2,H/2);return}
  const maxV=Math.max(...months,1);const pL=10,pR=10,pT=14,pB=22,cW=W-pL-pR,cH=H-pT-pB;
  const step=cW/(labels.length-1||1);const pts=months.map((v,i)=>({x:pL+i*step,y:pT+cH*(1-v/maxV)}));
  ctx.strokeStyle='rgba(28,25,23,.05)';ctx.lineWidth=1;
  for(let i=0;i<=3;i++){const y=pT+cH*(1-i/3);ctx.beginPath();ctx.moveTo(pL,y);ctx.lineTo(W-pR,y);ctx.stroke()}
  const grad=ctx.createLinearGradient(0,pT,0,H);grad.addColorStop(0,'rgba(55,48,163,.14)');grad.addColorStop(1,'rgba(55,48,163,0)');
  ctx.beginPath();ctx.moveTo(pts[0].x,cH+pT);pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(pts[pts.length-1].x,cH+pT);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.strokeStyle='#3b5bfc';ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
  ctx.fillStyle='#A8A29E';ctx.textAlign='center';ctx.font=`9px IBM Plex Mono`;
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
      <div style="font-family:var(--fm);font-size:.55rem;font-weight:700;color:${f.color};background:${f.color}18;border-radius:4px;padding:3px 5px;flex-shrink:0;min-width:28px;text-align:center;letter-spacing:.02em">${f.label}</div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <div style="font-size:.72rem;font-weight:500;color:var(--ink)">${f.name}</div>
          <div style="font-size:.62rem;font-weight:700;color:${f.color};font-family:var(--fm)">${f.v}</div>
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
function openAddTx(){
  state.ui.editTxId=null;
  document.getElementById('tx-modal-title').textContent='Add Transaction';
  document.getElementById('tx-save-btn').textContent='Add Transaction';
  ['tx-amount','tx-desc','tx-notes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('tx-type').value='expense';
  document.getElementById('tx-cat').value='food';
  document.getElementById('tx-date').value=nairobiDate();
  document.getElementById('tx-currency').value='KES';
  openModal('tx-modal');
}
function openEditTx(id){
  const tx=state.transactions.find(t=>t.id===id);if(!tx)return;
  state.ui.editTxId=id;
  document.getElementById('tx-modal-title').textContent='Edit Transaction';
  document.getElementById('tx-save-btn').textContent='Save Changes';
  document.getElementById('tx-amount').value=tx.amount;
  document.getElementById('tx-desc').value=tx.description;
  document.getElementById('tx-cat').value=tx.category;
  document.getElementById('tx-type').value=tx.type;
  document.getElementById('tx-date').value=tx.date;
  document.getElementById('tx-notes').value=tx.notes||'';
  document.getElementById('tx-currency').value=tx.currency||'KES';
  openModal('tx-modal');
}
function saveTx(){
  const amount=parseFloat(document.getElementById('tx-amount').value);
  const description=document.getElementById('tx-desc').value.trim();
  const category=document.getElementById('tx-cat').value;
  const type=document.getElementById('tx-type').value;
  const date=document.getElementById('tx-date').value;
  const notes=document.getElementById('tx-notes').value.trim();
  const currency=(document.getElementById('tx-currency')?.value||'KES').toUpperCase();
  if(!Number.isFinite(amount)||amount<=0){showToast('Enter a valid amount','error');return}
  if(!description){showToast('Enter a description','error');return}
  if(!date){showToast('Select a date','error');return}
  const savedKes=convertToKes(amount,currency,exchangeRates());
  if(state.ui.editTxId){
    const idx=state.transactions.findIndex(t=>t.id===state.ui.editTxId);
    if(idx!==-1)state.transactions[idx]={...state.transactions[idx],amount,description,category,type,date,notes,currency,amountKes:savedKes};
    showToast('Transaction updated','success');
  }else{
    state.transactions.push({id:uid(),amount,description,category,type,date,notes,currency,amountKes:savedKes,source:'manual',createdAt:new Date().toISOString()});
    showToast('Transaction added','success');
  }
  Store.set('transactions',state.transactions);
  closeModal('tx-modal');renderAll();renderTxPage();
  const sb=getSbClient();if(sb)syncNow();
}

// ═══════════════════════════════════════════════════════════
// CRUD — BUDGETS
// ═══════════════════════════════════════════════════════════
function openAddBudget(){
  state.ui.editBudgetId=null;
  document.getElementById('budget-modal-title').textContent='New Budget';
  document.getElementById('b-save-btn').textContent='Create Budget';
  document.getElementById('b-cat').value='food';
  document.getElementById('b-limit').value='';
  openModal('budget-modal');
}
function openEditBudget(id){
  const b=state.budgets.find(b=>b.id===id);if(!b)return;
  state.ui.editBudgetId=id;
  document.getElementById('budget-modal-title').textContent='Edit Budget';
  document.getElementById('b-save-btn').textContent='Save Changes';
  document.getElementById('b-cat').value=b.category;
  document.getElementById('b-limit').value=b.limit;
  openModal('budget-modal');
}
function saveBudget(){
  const category=document.getElementById('b-cat').value;
  const limit=parseFloat(document.getElementById('b-limit').value);
  if(!limit||limit<=0){showToast('Enter a valid limit','error');return}
  if(state.ui.editBudgetId){
    if(state.budgets.some(b=>b.category===category&&b.id!==state.ui.editBudgetId)){showToast('Budget for this category already exists','error');return}
    const idx=state.budgets.findIndex(b=>b.id===state.ui.editBudgetId);
    if(idx!==-1)state.budgets[idx]={...state.budgets[idx],category,limit};
    showToast('Budget updated','success');
  }else{
    if(state.budgets.find(b=>b.category===category)){showToast('Budget for this category already exists','error');return}
    state.budgets.push({id:uid(),category,limit,period:'monthly'});
    showToast('Budget created','success');
  }
  Store.set('budgets',state.budgets);closeModal('budget-modal');
  renderBudgetsPage(); renderBudgetStatus(_chartPeriod);
  const sb=getSbClient();if(sb)syncNow();
}

// ═══════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════
function confirmDel(type,id){
  const item=type==='tx'?state.transactions.find(t=>t.id===id):state.budgets.find(b=>b.id===id);
  if(!item)return;
  const name=type==='tx'?item.description:(CATS[item.category]||CATS.other).label;
  state.pendingDel={type,id};
  document.getElementById('cm-title').textContent=type==='tx'?'Delete Transaction?':'Delete Budget?';
  document.getElementById('cm-sub').textContent=`"${name}" will be permanently deleted.`;
  document.getElementById('cm-ok').onclick=execDel;
  openModal('confirm-modal');
}
function execDel(){
  const{type,id}=state.pendingDel;
  if(type==='tx'){
    state.transactions=state.transactions.filter(t=>t.id!==id);
    Store.set('transactions',state.transactions);
    showToast('Transaction deleted','info');renderAll();renderTxPage();
  }else{
    state.budgets=state.budgets.filter(b=>b.id!==id);
    Store.set('budgets',state.budgets);
    showToast('Budget deleted','info');renderBudgetsPage();
  }
  closeModal('confirm-modal');
  const sb=getSbClient();if(sb)syncNow();
}

// ═══════════════════════════════════════════════════════════
// MPESA IMPORT
// ═══════════════════════════════════════════════════════════
function dzDrag(e,on){e.preventDefault();document.getElementById('drop-zone').classList.toggle('drag',on)}
function dzDrop(e){e.preventDefault();dzDrag(e,false);const f=e.dataTransfer.files[0];if(f?.type==='application/pdf')setFile(f)}
function handlePDF(inp){if(inp.files[0])setFile(inp.files[0])}
function setFile(f){
  state.selectedFile=f;
  document.getElementById('fp-name').textContent=f.name;
  document.getElementById('fp-size').textContent=(f.size/1024).toFixed(1)+' KB';
  document.getElementById('file-preview').classList.add('vis');
}
function clearFile(){state.selectedFile=null;document.getElementById('file-preview').classList.remove('vis');document.getElementById('pdf-file').value=''}

async function runImport(){
  if(!state.selectedFile){showToast('Select a PDF first','error');return}
  document.getElementById('import-btn').disabled=true;
  document.getElementById('steps-list').classList.add('vis');
  document.getElementById('import-result').classList.remove('vis');
  const setS = (n, st) => {
    const el = document.getElementById('stp'+n);
    const dot = el.querySelector('.step-dot');
    el.className = 'step ' + st;
    dot.textContent = st === 'done' ? '✓' : st === 'act' ? '⟳' : n;
  };
  try{
    setS(1,'act');
    let pdfText='';
    try{
      const pdfjsLib=await loadPdfJs();
      const pw=document.getElementById('pdf-pw').value;
      const ab=await state.selectedFile.arrayBuffer();
      const task=pdfjsLib.getDocument({
        data:ab, password:pw,
        isEvalSupported:false,   // hardening: never compile code from PDF content
        cMapUrl:'vendor/pdfjs/cmaps/', cMapPacked:true,
        standardFontDataUrl:'vendor/pdfjs/standard_fonts/',
      });
      const pdf=await task.promise;
      for(let p=1;p<=pdf.numPages;p++){
        const page=await pdf.getPage(p);
        const tc=await page.getTextContent();
        // hasEOL keeps statement rows on their own lines, which keeps chunks aligned to rows
        pdfText+=tc.items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('')+'\n';
      }
    }catch(e){
      if(e.name==='PasswordException'){showToast('Wrong PDF password — try your National ID','error');resetImport();return}
      console.error('PDF read failed',e);
      showToast('Could not read this PDF. Check that it is an M-Pesa statement and try again.','error');
      resetImport();return;
    }
    if(!pdfText.trim()){showToast('No text found in this PDF. Scanned statements are not supported.','error');resetImport();return}
    setS(1,'done');setS(2,'act');await delay(400);setS(2,'done');
    setS(3,'act');
    const parsed=await parseWithClaude(pdfText);
    // Skip statement rows already imported earlier (matched on M-Pesa receipt number)
    const knownReceipts=new Set(state.transactions.map(t=>t.externalRef).filter(Boolean));
    const txs=parsed.filter(t=>!t.receipt||!knownReceipts.has(t.receipt));
    setS(3,'done');setS(4,'act');await delay(500);setS(4,'done');
    setS(5,'act');
    const batchId=uid();
    const imp={id:batchId,filename:state.selectedFile.name,count:txs.length,date:new Date().toISOString(),status:'success'};
    txs.forEach(({receipt,...tx})=>{
      const clean=normalizeTx({...tx,externalRef:receipt||undefined,id:uid(),source:'import',importBatch:batchId});
      if(clean)state.transactions.push(clean);
    });
    state.imports.push(imp);
    Store.set('transactions',state.transactions);Store.set('imports',state.imports);
    setS(5,'done');
    document.getElementById('ir-stats').innerHTML=[
      {v:txs.length,l:'Total'},{v:txs.filter(t=>t.type==='expense').length,l:'Expenses'},{v:txs.filter(t=>t.type==='income').length,l:'Income'}
    ].map(s=>`<div class="ir-stat"><div class="ir-sv">${s.v}</div><div class="ir-sl">${s.l}</div></div>`).join('');
    document.getElementById('import-result').classList.add('vis');
    document.getElementById('import-badge').style.display='';
    renderImportHistory();showToast(` ${txs.length} transactions imported!`,'success');
    const sb=getSbClient();if(sb)syncNow();
    setTimeout(renderAll,300);
  }catch(e){showToast('Import failed: '+(e.message||'unknown error'),'error');console.error(e);resetImport()}
  document.getElementById('import-btn').disabled=false;
}

// PDF.js is self-hosted (copied to public/vendor/ by scripts/build.mjs) and loaded on first use.
let _pdfjs=null;
async function loadPdfJs(){
  if(_pdfjs)return _pdfjs;
  const lib=await import(new URL('vendor/pdfjs/pdf.min.mjs',document.baseURI).href);
  lib.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/pdf.worker.min.mjs',document.baseURI).href;
  return(_pdfjs=lib);
}

async function parseWithClaude(text) {
  // Kept small so each /api/ai call finishes inside Netlify's 60 s function limit.
  const CHUNK_SIZE = 3500;
  const chunks = [];
  let remaining = text.trim();

  // Split at newline boundaries so no transaction is cut in half
  while (remaining.length > 0) {
    if (remaining.length <= CHUNK_SIZE) {
      chunks.push(remaining);
      break;
    }
    const lastNl = remaining.lastIndexOf('\n', CHUNK_SIZE);
    const end = lastNl > CHUNK_SIZE * 0.5 ? lastNl : CHUNK_SIZE;
    chunks.push(remaining.slice(0, end));
    remaining = remaining.slice(end).trimStart();
  }

  const allTxs = [];
  const seen = new Set();
  const step3El = document.getElementById('stp3');

  for (let i = 0; i < chunks.length; i++) {
    if (step3El) step3El.lastChild.textContent = ` Claude AI — chunk ${i+1} of ${chunks.length}…`;
    const txs = await _parseChunk(chunks[i]);
    for (const tx of txs) {
      // Deduplicate: M-Pesa receipt number, else same date + amount + first 35 chars of description
      const key = tx.receipt || `${tx.date}|${tx.amount}|${(tx.description||'').slice(0,35)}`;
      if (!seen.has(key)) { seen.add(key); allTxs.push(tx); }
    }
  }

  if (step3El) step3El.lastChild.textContent = ' Claude AI categorising transactions';
  return allTxs;
}

// Extraction prompt, JSON schema and row validation live in netlify/functions/ai.mjs.
// Returns validated rows: { description, amount, type, category, date, receipt }.
async function _parseChunk(text) {
  const data = await postAi({ mode: 'import', text });
  return Array.isArray(data.transactions) ? data.transactions : [];
}

function renderImportHistory(){
  const el=document.getElementById('import-history');
  if(!state.imports.length){el.innerHTML='<div class="empty"><div class="empty-icon" style="font-family:var(--fm);font-size:1.8rem;color:var(--ink3)">⌃</div><div class="empty-title">No imports yet</div><div class="empty-sub">Upload your first M-Pesa statement.</div></div>';return}
  el.innerHTML=`<table><thead><tr><th>File</th><th>Date</th><th>Transactions</th><th>Status</th></tr></thead><tbody>${state.imports.slice().reverse().map(i=>`<tr><td><div style="display:flex;align-items:center;gap:8px"><div style="font-size:1.1rem">📄</div><div class="td-main">${escHtml(i.filename)}</div></div></td><td>${new Date(i.date).toLocaleDateString()}</td><td><span class="td-mono">${i.count}</span></td><td><div class="st-pill manual">✓ Success</div></td></tr>`).join('')}</tbody></table>`;
}

function resetImport(){
  [1,2,3,4,5].forEach(n=>{
    const el=document.getElementById('stp'+n);
    if(!el) return;
    el.className='step';
    const d=el.querySelector('.step-dot');
    if(d){d.textContent=n;}
  });
  document.getElementById('steps-list').classList.remove('vis');
  document.getElementById('import-btn').disabled=false;
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
    inBtn.style.cssText = 'flex:1;padding:7px;border-radius:6px;border:none;font-size:.72rem;font-weight:600;cursor:pointer;background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.08)';
    upBtn.style.cssText = 'flex:1;padding:7px;border-radius:6px;border:none;font-size:.72rem;font-weight:600;cursor:pointer;background:transparent;color:var(--ink3)';
    submitBtn.textContent = 'Sign In';
    pwInput.autocomplete = 'current-password';
  } else {
    upBtn.style.cssText = 'flex:1;padding:7px;border-radius:6px;border:none;font-size:.72rem;font-weight:600;cursor:pointer;background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.08)';
    inBtn.style.cssText = 'flex:1;padding:7px;border-radius:6px;border:none;font-size:.72rem;font-weight:600;cursor:pointer;background:transparent;color:var(--ink3)';
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
      : await sb.auth.signUp({ email, password });
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

async function signOut() {
  const sb = getSbClient();
  if (sb) {
    await syncNow().catch(() => {});   // push pending changes before the cache is cleared
    await sb.auth.signOut();
  }
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
  if (activeProfile !== userId) {
    const local = activeProfile === 'local' ? loadProfileData('local') : null;
    switchProfile(userId);
    const nTx = local?.transactions.length || 0, nB = local?.budgets.length || 0;
    if ((nTx || nB) && confirm(`This device has ${nTx} transaction${nTx === 1 ? '' : 's'} and ${nB} budget${nB === 1 ? '' : 's'} that are not in an account.\n\nAdd them to ${session.user.email}?`)) {
      const merge = (mine, theirs) => [...mine, ...theirs.filter(t => !mine.some(m => m.id === t.id))];
      state.transactions = merge(state.transactions, local.transactions);
      state.budgets = merge(state.budgets, local.budgets.filter(b => !state.budgets.some(x => x.category === b.category)));
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
  CFG.set('name',document.getElementById('cfg-name').value||'Jeremy');
  CFG.set('role',document.getElementById('cfg-role').value||'Admin');
  CFG.set('fireTarget',parseFloat(document.getElementById('cfg-fire').value)||3000000);
  document.getElementById('tb-name').textContent=CFG.get('name');
  document.getElementById('tb-av').textContent=CFG.get('name').charAt(0).toUpperCase();
  document.getElementById('tb-role').textContent=CFG.get('role');
  showToast('Profile saved','success');
}
function toggleKeyVis(inputId,btn){
  const inp=document.getElementById(inputId);
  inp.type=inp.type==='password'?'text':'password';
  btn.textContent=inp.type==='password'?'Show':'Hide';
}

// ═══════════════════════════════════════════════════════════
// EXPORT CSV
// ═══════════════════════════════════════════════════════════
function exportCSV(){
  if(!state.transactions.length){showToast('No transactions to export','info');return}
  const hdr=['Date','Description','Category','Type','Amount','Currency','Amount (KES)','Source','Notes'];
  const rows=state.transactions.map(t=>[t.date,`"${(t.description||'').replace(/"/g,'""')}"`,t.category,t.type,t.amount,t.currency||'KES',txAmountKes(t).toFixed(2),t.source,`"${(t.notes||'').replace(/"/g,'""')}"`]);
  const csv=[hdr,...rows].map(r=>r.join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`fynpet-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  showToast('CSV exported','success');
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
function toggleMobSidebar(){
  document.getElementById('sidebar').classList.toggle('mob-open');
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
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
  document.getElementById('page-'+id)?.classList.add('on');
  if(navEl)navEl.classList.add('on');
  // Sync mobile bottom nav highlight
  document.querySelectorAll('.mn-item').forEach(mn=>{
    const mnPage=readArgs(mn,'click')[0];
    mn.classList.toggle('on', mnPage===id);
  });
  const titles={dashboard:'Dashboard',transactions:'Transactions',budgets:'Budgets',analytics:'Analytics',mpesa:'M-Pesa Import',settings:'API & Settings'};
  document.getElementById('tb-title').childNodes[0].textContent=(titles[id]||id)+' ';
  if(id==='transactions'){
    state.ui.txFilter='all';state.ui.txSearch='';state.ui.txPage=1;
    document.querySelectorAll('#tx-filter-row .fb').forEach((b,i)=>b.classList.toggle('on',i===0));
    const srch=document.getElementById('tx-search');if(srch)srch.value='';
    renderTxPage();
  }
  if(id==='budgets')renderBudgetsPage();
  if(id==='analytics')renderAnalytics();
  if(id==='mpesa')renderImportHistory();
  if(id==='settings')loadSettingsPage();
}

function loadSettingsPage() {
  // Populate profile, FIRE, and exchange rate fields
  [['cfg-name','name'],['cfg-role','role'],['cfg-fire','fireTarget'],
   ['cfg-rate-usd','rate_USD'],['cfg-rate-eur','rate_EUR'],['cfg-rate-gbp','rate_GBP'],['cfg-rate-tzs','rate_TZS'],['cfg-rate-ugx','rate_UGX']
  ].forEach(([id,key]) => {
    const el = document.getElementById(id);
    if (el) { const v = CFG.get(key); if (v) el.value = v; }
  });
  // Reflect current cloud connection state
  const cfg = window._cloudConfig;
  updateCloudStatus('claude', cfg?.aiEnabled ? true : false, cfg?.aiEnabled ? '✓ Ready (sign in to use)' : '✕ Not configured');
  updateCloudStatus('sb', cfg?.supabaseUrl ? true : false, cfg?.supabaseUrl ? '✓ Connected' : '✕ Not connected');
}


// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function openModal(id){document.getElementById(id).classList.add('open')}
function closeModal(id){
  document.getElementById(id).classList.remove('open');
  // Dismissing the consent dialog (Escape / backdrop) counts as "Not now".
  if(id==='ai-consent-modal'&&_consentResolve){_consentResolve(false);_consentResolve=null;}
}
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-overlay.open').forEach(m=>closeModal(m.id))});

let _toastTimer=null;
function showToast(msg,type='success'){
  const t=document.getElementById('toast');const icons={success:'✓',error:'✕',info:'ℹ'};
  t.className='show '+type;document.getElementById('ti').textContent=icons[type]||'✓';document.getElementById('tm').textContent=msg;
  if(_toastTimer)clearTimeout(_toastTimer);_toastTimer=setTimeout(()=>t.classList.remove('show'),3200);
}

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
function showAllTxTypes(){document.querySelector('#tx-filter-row .fb')?.click()}
function choosePdf(e){e.preventDefault();document.getElementById('pdf-file').click()}
function submitOnEnter(e){if(e.key==='Enter')submitAuth()}

const ACTIONS = {
  answerAiConsent, autoResize, choosePdf, clearFile, clearLocalData, closeModal, confirmDel, confirmSignOut, dzDrag, dzDrop,
  exportCSV, goPage, handleAdvisorKey, handlePDF, mobGoPage, openAddBudget, openAddTx, openEditBudget,
  openEditTx, recheckCloudConfig, replayHistory, runAiAnalysis, runImport, saveAllConfig, saveBudget,
  saveConfig, saveTx, searchTx, sendAdvisorMessage, sendQuick, setAdvTab, setAuthTab, setChartPeriod,
  setTxFilter, setTxPage, showAllTxTypes, skipAuth, submitAuth, submitOnEnter, syncNow, toggleAdvisor,
  toggleMobSidebar,
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

window.addEventListener('resize',()=>{drawMainChart(_chartPeriod);drawDonutChart(_chartPeriod);drawTrendChart?.()})

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
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
  const impTo = document.getElementById('imp-to');
  if (impTo) impTo.value = nairobiDate(now);
  const previousMonth = monthKey(now,-1);
  const lastDay = new Date(Date.UTC(Number(previousMonth.slice(0,4)), Number(previousMonth.slice(5)), 0)).getUTCDate();
  const impFrom = document.getElementById('imp-from');
  if (impFrom) impFrom.value = previousMonth+'-'+String(Math.min(Number(nairobiDate(now).slice(8)),lastDay)).padStart(2,'0');

  // Profile
  const name = CFG.get('name') || 'Jeremy';
  const role = CFG.get('role') || 'Admin';
  document.getElementById('tb-name').textContent = name;
  document.getElementById('tb-av').textContent = name.charAt(0).toUpperCase();
  document.getElementById('tb-role').textContent = role;

  // Advisor panel: closed by default (overlay model — user opens it)
  state.ui.advisorOpen = false;

  // Main render
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
