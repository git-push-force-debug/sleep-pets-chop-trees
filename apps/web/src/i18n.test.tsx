// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentLang, LangProvider, LangSwitch, useLang } from './i18n.tsx';

function Probe() {
  return <p>{useLang().t.nav.guide}</p>;
}
const mount = () => render(<LangProvider><LangSwitch /><Probe /></LangProvider>);

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('language setting', () => {
  it('switches text and <html lang>, and remembers the choice', () => {
    mount();
    expect(screen.getByText('Guide')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '中文' }));
    expect(screen.getByText('指南')).toBeTruthy();
    expect(document.documentElement.lang).toBe('zh-Hans');
    expect(screen.getByRole('button', { name: '中文' }).getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('spct-lang')).toBe('zh');
    expect(currentLang()).toBe('zh');
    cleanup();
    mount(); // reload
    expect(screen.getByText('指南')).toBeTruthy();
  });

  it('still works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    mount();
    fireEvent.click(screen.getByRole('button', { name: '中文' }));
    expect(screen.getByText('指南')).toBeTruthy();
  });

});
