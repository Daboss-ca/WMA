import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Usage:
// 1) Use your real Supabase values (not placeholders like <project-ref>).
// 2) Run: npx tsx test-realtime.ts
// 3) In the Supabase dashboard, open the orders table and insert a new row.
// 4) Watch this terminal for a log line beginning with "REALTIME EVENT RECEIVED:"
//
// This script supports both frontend env names and the backend env names already used by this repo.

function readDotEnv(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, 'utf8');
  const env: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=').trim();
    env[key.trim()] = value.replace(/^['"]|['"]$/g, '');
  }

  return env;
}

const envFiles = [
  join(process.cwd(), '.env'),
  join(process.cwd(), 'backend', '.env'),
];

const loadedEnv = Object.assign({}, ...envFiles.map(readDotEnv));

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  loadedEnv.SUPABASE_URL ??
  loadedEnv.VITE_SUPABASE_URL ??
  '';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  loadedEnv.SUPABASE_SERVICE_ROLE_KEY ??
  loadedEnv.SUPABASE_SECRET_KEY ??
  loadedEnv.SUPABASE_ANON_KEY ??
  loadedEnv.VITE_SUPABASE_ANON_KEY ??
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables.');
  console.error('Set one of the following pairs:');
  console.error('  SUPABASE_URL + SUPABASE_ANON_KEY');
  console.error('  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  console.error('  SUPABASE_URL + SUPABASE_SECRET_KEY');
  console.error('  VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY');
  console.error('Also make sure you did not leave placeholder values like <project-ref> or <service-role-key>.');
  process.exit(1);
}

if (supabaseUrl.includes('<') || supabaseUrl.includes('>')) {
  console.error('Malformed Supabase URL detected. Replace the placeholder value with your real Supabase project URL.');
  console.error('Expected format: https://<project-ref>.supabase.co');
  console.error('Actual value:', supabaseUrl);
  process.exit(1);
}

console.log('Initializing Supabase Realtime test...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

const channel = supabase.channel('test-channel');

channel
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'orders' },
    (payload) => {
      console.log('REALTIME EVENT RECEIVED:', JSON.stringify(payload, null, 2));
    },
  )
  .subscribe((status, err) => {
    console.log('CHANNEL STATUS:', status);

    if (status === 'SUBSCRIBED') {
      console.log('✅ Realtime subscription is active. Insert a row into the public.orders table now.');
    }

    if (status === 'CHANNEL_ERROR') {
      console.error('❌ CHANNEL_ERROR:', err);
      console.error('Check your Supabase project URL, key, and Realtime settings.');
    }

    if (status === 'TIMED_OUT') {
      console.warn('⚠️ TIMED_OUT: Realtime connection timed out. Check network access or project status.');
    }

    if (status === 'CLOSED') {
      console.warn('⚠️ CLOSED: Channel was closed.');
    }
  });

console.log('Listening for changes on public.orders...');
console.log('Leave this process running and insert a row in the Supabase dashboard.');

process.on('SIGINT', () => {
  console.log('\nClosing channel...');
  supabase.removeChannel(channel);
  process.exit(0);
});

process.stdin.resume();
