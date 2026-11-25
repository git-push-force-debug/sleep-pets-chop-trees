import { expect, it } from 'vitest';
import { ticketLabel } from './api.ts';

it('formats Chatwoot ids as full ticket numbers', () => {
  expect(ticketLabel(3)).toBe('#10003');
  expect(ticketLabel(1015)).toBe('#11015');
  expect(ticketLabel(null)).toBe('');
});
