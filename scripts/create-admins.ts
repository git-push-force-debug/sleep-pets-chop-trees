// Creates an admin-panel account for every email in ADMIN_EMAILS.
// New passwords are appended to .admin-credentials (gitignored, owner-only) and never printed.
// Run: npx tsx --env-file=.env.local scripts/create-admins.ts
import { randomBytes } from 'node:crypto';
import { appendFileSync, chmodSync, existsSync, writeFileSync } from 'node:fs';
import { createServiceClient } from '../apps/api/src/lib/store.ts';

const { SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_EMAILS } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !ADMIN_EMAILS) throw new Error('SUPABASE_URL, SUPABASE_SECRET_KEY and ADMIN_EMAILS are required');

const db = createServiceClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
const emails = ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw new Error(listError.message);

const CREDENTIALS = '.admin-credentials';
if (!existsSync(CREDENTIALS)) writeFileSync(CREDENTIALS, '# Admin panel sign-ins. Change each password after first sign-in.\n', { mode: 0o600 });

let created = 0;
let existing = 0;
for (const email of emails) {
  let userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
  if (userId) {
    existing += 1;
  } else {
    const password = randomBytes(15).toString('base64url');
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new Error(`could not create ${email}: ${error?.message}`);
    userId = data.user.id;
    appendFileSync(CREDENTIALS, `${email}  ${password}\n`);
    created += 1;
  }
  const { error } = await db.from('agents').upsert({ user_id: userId, role: 'admin', display_name: email.split('@')[0] });
  if (error) throw new Error(error.message);
}
chmodSync(CREDENTIALS, 0o600);
console.log(`${created} admin(s) created, ${existing} already existed — passwords for new accounts are in ${CREDENTIALS}`);
