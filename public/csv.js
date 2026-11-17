// CSV helpers. Text cells that start with = + - @ (or a tab / carriage return) can be run as
// formulas by spreadsheet programs, and statement counterparties are chosen by other people,
// so those cells are prefixed with an apostrophe.
export function csvText(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

// Numbers and fixed codes are written as they are.
export const csvRow = cells => cells.join(',');
