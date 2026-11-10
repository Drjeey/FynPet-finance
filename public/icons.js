// One geometric, stroke-based icon set for the approved Stitch interface.
const paths = {
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  ledger:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
  wallet:'<path d="M3 7h18v13H3V7Zm0 0V4h15v3"/><path d="M21 11h-6v5h6M17 13.5h.01"/>',
  chart:'<path d="M4 3v17h17M8 16v-5m5 5V7m5 9V4"/>',
  import:'<path d="M14 2H5v20h14V7l-5-5Zm0 0v6h5M12 11v7m-3-3 3 3 3-3"/>',
  settings:'<path d="m10 3-1 3-3 1-3 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-3-3-3-1-1-3h-4Z"/><circle cx="12" cy="11" r="3"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  export:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  sync:'<path d="M20 7a8 8 0 0 0-13-3L4 7m0-4v4h4M4 17a8 8 0 0 0 13 3l3-3m0 4v-4h-4"/>',
  send:'<path d="M12 20V4m-6 6 6-6 6 6"/>',
  edit:'<path d="m15 4 5 5-11 11H4v-5L15 4Zm-2 2 5 5"/>',
  delete:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
};
export function icon(name) {
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.ledger}</svg>`;
}
export function renderIcons(root=document) {
  root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
}
