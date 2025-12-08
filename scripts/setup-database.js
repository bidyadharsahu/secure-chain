import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aocicxbirzgsflxnyldq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvY2ljeGJpcnpnc2ZseG55bGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzMxMzMsImV4cCI6MjA4MDc0OTEzM30.YbLIGChiSq33TqyTFvUbThclG5Nc-5zH_wxbYcLSM7M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🔄 Testing Supabase connection...');
  
  // Test connection
  const { data, error } = await supabase.from('transactions').select('count');
  
  if (error) {
    console.log('⚠️  Tables not created yet. Please run the schema in Supabase SQL Editor.');
    console.log('📋 Next steps:');
    console.log('1. Go to https://aocicxbirzgsflxnyldq.supabase.co');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy the contents of supabase/schema.sql');
    console.log('4. Paste and run in SQL Editor');
    process.exit(1);
  }
  
  console.log('✅ Supabase connected successfully!');
  console.log('✅ Database tables are ready!');
}

setupDatabase().catch(console.error);
