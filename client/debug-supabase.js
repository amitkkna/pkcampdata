import { supabase } from './src/services/supabaseClient';

console.log('🔍 Testing Supabase Connection...');
console.log('Environment variables:');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// Test basic connection
async function testConnection() {
  try {
    console.log('📡 Testing Supabase health...');
    const { data, error } = await supabase
      .from('campaigns')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase Error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    } else {
      console.log('✅ Supabase connected successfully!');
      console.log('Campaign count:', data);
    }
  } catch (err) {
    console.error('❌ Connection test failed:', err);
  }
}

// Test table structure
async function testTableStructure() {
  try {
    console.log('🔍 Testing table structure...');
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Table structure error:', error);
    } else {
      console.log('✅ Table structure test passed');
      console.log('Sample data:', data);
    }
  } catch (err) {
    console.error('❌ Table structure test failed:', err);
  }
}

// Run tests
testConnection();
testTableStructure();
