import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { UI_EN, UI_ZH, UiLabelsContext } from './labels.tsx';

export type Lang = 'en' | 'zh';
export const LANGS: { id: Lang; label: string; htmlLang: string; locale: string }[] = [
  { id: 'en', label: 'EN', htmlLang: 'en', locale: 'en-US' },
  { id: 'zh', label: '中文', htmlLang: 'zh-Hans', locale: 'zh-CN' },
];

/**
 * English / 中文 setting for one app: a provider, a hook, an EN | 中文 switch, and getters for code outside React.
 * Each app passes its own strings (`zh` typed like `en`, so a missing key fails tsc) and storage key.
 */
export function createLang<S extends { language: string }>(strings: Record<Lang, S>, storageKey: string) {
  let current: Lang = 'en';

  const initial = (): Lang => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'en' || saved === 'zh') return saved;
    } catch {
      // storage blocked (private mode): fall through to the browser language
    }
    return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  };

  const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: S; locale: string }>({ lang: 'en', setLang: () => {}, t: strings.en, locale: 'en-US' });

  function LangProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(initial);
    current = lang;
    const meta = LANGS.find((l) => l.id === lang)!;
    useEffect(() => {
      document.documentElement.lang = meta.htmlLang;
    }, [meta]);
    const value = useMemo(
      () => ({
        lang,
        t: strings[lang],
        locale: meta.locale,
        setLang: (l: Lang) => {
          setLangState(l);
          try {
            localStorage.setItem(storageKey, l);
          } catch {
            // not saved; the choice still applies for this visit
          }
        },
      }),
      [lang, meta],
    );
    return (
      <Ctx.Provider value={value}>
        <UiLabelsContext.Provider value={lang === 'zh' ? UI_ZH : UI_EN}>{children}</UiLabelsContext.Provider>
      </Ctx.Provider>
    );
  }

  const useLang = () => useContext(Ctx);

  /** EN | 中文 segmented switch. */
  function LangSwitch({ className = '' }: { className?: string }) {
    const { lang, setLang, t } = useLang();
    return (
      <div className={`lang-switch ${className}`} role="group" aria-label={t.language}>
        {LANGS.map((l) => (
          <button key={l.id} type="button" lang={l.htmlLang} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
    );
  }

  return { LangProvider, useLang, LangSwitch, currentLang: () => current, currentStrings: () => strings[current] };
}
