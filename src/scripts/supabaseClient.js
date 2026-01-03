const SUPABASE_URL = 'https://aifxjrcbxtvblqhgsrbs.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZnhqcmNieHR2YmxxaGdzcmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzMyMTEsImV4cCI6MjA3OTI0OTIxMX0.lxZiZp3lVbreifHWdyJha7oSXDnhDKZ9vLPQUuqtwDA';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.81.1/+esm';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function isUserLoggedIn() {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
}

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export { isUserLoggedIn, getCurrentUser };