import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function seedTestData() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Create test organization
  const { data: org } = await supabase
    .from('organizations')
    .insert({ name: 'Test Organization', domain: 'test.com' })
    .select()
    .single();

  // Create test users (end user, agent, manager)
  const users = [
    {
      email: 'user@test.com',
      full_name: 'Test User',
      role: 'end_user',
      tenant_id: org.id,
    },
    {
      email: 'agent@test.com',
      full_name: 'Test Agent',
      role: 'agent',
      tenant_id: org.id,
    },
  ];

  await supabase.from('users').insert(users);

  return { organization: org };
}

export async function cleanupTestData() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Delete test organization (cascade deletes users, tickets, etc.)
  await supabase.from('organizations').delete().eq('domain', 'test.com');
}
