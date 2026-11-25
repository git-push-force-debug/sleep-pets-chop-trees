import { Link } from 'react-router';

export function NotFound() {
  return (
    <section className="wrap page-pad stack-m not-found">
      <img src="/art/empty-chat.png" alt="" width="520" height="404" />
      <h1>Page not found</h1>
      <p>This page wandered off into the Enchanted Grove.</p>
      <Link to="/" className="text-link">Back to the ranch →</Link>
    </section>
  );
}
