// Copies pinned browser libraries from node_modules into public/vendor/ so the site
// serves them itself (versions locked by package-lock.json; allowed by CSP 'self').
// Runs on every Netlify build (netlify.toml → command) and before local previews.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const out = 'public/vendor';
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/pdfjs`, { recursive: true });

const copies = [
  // Legacy build: supports older Android browsers common on budget phones.
  ['node_modules/pdfjs-dist/legacy/build/pdf.min.mjs', `${out}/pdfjs/pdf.min.mjs`],
  ['node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', `${out}/pdfjs/pdf.worker.min.mjs`],
  ['node_modules/pdfjs-dist/cmaps', `${out}/pdfjs/cmaps`],
  ['node_modules/pdfjs-dist/standard_fonts', `${out}/pdfjs/standard_fonts`],
  ['node_modules/@supabase/supabase-js/dist/umd/supabase.js', `${out}/supabase.js`],
];
for (const [from, to] of copies) cpSync(from, to, { recursive: true });
console.log(`vendor: copied ${copies.length} entries to ${out}/`);
