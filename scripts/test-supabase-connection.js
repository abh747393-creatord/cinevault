const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msoenbqurypcednvwsgz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zb2VuYnF1cnlwY2VkbnZ3c2d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMzAzNDMsImV4cCI6MjEwNDcwNjM0M30.ZixA0_LRC9-XWP1ME-4Jz7miJKnGBairsQg5tkBV7wk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConnection() {
  console.log('Testing connection to Supabase project...');
  
  // Test 1: Check Auth service
  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('Auth Service status:', authError ? `Error: ${authError.message}` : 'Connected OK');
  } catch (err) {
    console.log('Auth check error:', err.message);
  }

  // Test 2: Check Content table
  try {
    const { data, error } = await supabase.from('content').select('id, title').limit(5);
    if (error) {
      console.log('Content table check:', error.message);
      if (error.code === '42P01') {
        console.log('NOTE: Tables do not exist yet in this Supabase database. SQL migrations need to be executed!');
      }
    } else {
      console.log(`Content table check: OK, found ${data.length} records`);
    }
  } catch (err) {
    console.log('Database query error:', err.message);
  }
}

checkConnection();
