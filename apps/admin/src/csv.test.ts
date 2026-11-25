import { describe, expect, it } from 'vitest';
import { toCsv } from './csv.ts';

describe('toCsv', () => {
  it('quotes cells, escapes quotes and keeps commas and newlines inside a cell', () => {
    expect(toCsv([{ a: 'x, y', b: 'say "hi"\nthere', c: null }])).toBe('"a","b","c"\r\n"x, y","say ""hi""\nthere",""');
  });

  it('stops spreadsheet formulas from running', () => {
    expect(toCsv([{ a: '=HYPERLINK("x")', b: '-2+3', c: '@SUM(1)', d: 'ok' }]).split('\r\n')[1]).toBe(`"'=HYPERLINK(""x"")","'-2+3","'@SUM(1)","ok"`);
  });

  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('');
  });
});
