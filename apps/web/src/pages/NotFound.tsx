import { Link } from 'react-router';
import { useLang } from '../i18n.tsx';

export function NotFound() {
  const { t } = useLang();
  return (
    <section className="wrap page-pad stack-m not-found">
      <img src="/art/empty-chat.png" alt="" width="520" height="404" />
      <h1>{t.notFoundTitle}</h1>
      <p>{t.notFoundText}</p>
      <Link to="/" className="text-link">{t.backHome}</Link>
    </section>
  );
}
