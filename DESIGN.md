# FynPet UI

Mode: Operate. Implement the user's approved Stitch screens, not a new visual direction.

Source: Stitch project 6604114113186029730, export downloaded 10 November 2026 to `../STITCH DESIGNS/export_2026-11-10/`. The exported current canonical specification supersedes older screen token definitions.

Use Inter for controls and prose, Source Serif 4 for page headings, and JetBrains Mono for currency figures. Warm cream #FCF9F5, white cards, indigo #3730A3 / #312E81 actions, slate #0F172A text, #475569 secondary, #526071 placeholders, #065F46 success, #991B1B error, #92400E warning. Secondary type >=12px; mobile input/body text >=16px. Primary controls and icon targets >=44px.

Desktop: shared sidebar with Dashboard, Transactions, Budgets, Analytics, M-Pesa Import, Settings and an obvious Ask Fyn AI action. Mobile: Home, Transactions, Add, Budgets, More. More exposes Analytics, Import, Settings and AI. Full-screen mobile AI hides bottom navigation. Dialogs and AI use scrollable content and reachable fixed actions, including short windows and virtual keyboards.

Preserve real calculations, data, authentication and event delegation. Prototype demo figures, fake keyboard markup, state toolbars, unsupported statuses, CDN scripts and inline handlers must not be imported into production. Keep saved historical currency conversions and real sync states. Use exact local PDF / Netlify / Anthropic consent wording. Verify at 320, 375, 768, 1024 and 1440px.
