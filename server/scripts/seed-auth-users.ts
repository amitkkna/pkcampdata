import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  if (!url || !serviceKey) throw new Error('Missing Supabase credentials');
  const admin = createClient(url, serviceKey);
  const users = [
    { email: 'admin@globaldigitalconnect.com', password: 'admin123' },
    { email: 'prateek@globaldigitalconnect.com', password: 'prateek123' },
  ];
  for (const u of users) {
    // Upsert: try to create; if exists, ignore
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error && !/already exists/i.test(error.message)) {
      console.error('Error creating user', u.email, error.message);
    } else if (!error) {
      console.log('Created user', data.user?.email);
    } else {
      console.log('User exists', u.email);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
