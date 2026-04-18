import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables.');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before running this script.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🔄 Testing Supabase connection...');
  
  // Test connection
  const { data, error } = await supabase.from('transactions').select('count');
  
  if (error) {
    console.log('⚠️  Tables not created yet. Please run the schema in Supabase SQL Editor.');
    console.log('📋 Next steps:');
    console.log(`1. Go to ${supabaseUrl}`);
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy the contents of supabase/schema.sql');
    console.log('4. Paste and run in SQL Editor');
    process.exit(1);
  }
  
  console.log('✅ Supabase connected successfully!');
  console.log('✅ Database tables are ready!');
}

setupDatabase().catch(console.error);
