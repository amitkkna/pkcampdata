import { useState } from 'react';
import { supabase } from '../services/supabaseClient';

export default function SupabaseDebugPanel() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testConnection = async () => {
    setTesting(true);
    const testResults: any = {
      envVars: {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'NOT SET',
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        anonKeyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
      }
    };

    // Test basic connection
    try {
      const { count, error } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });
      
      testResults.dbConnection = error ? 
        { success: false, error: error.message } : 
        { success: true, count };
    } catch (err: any) {
      testResults.dbConnection = { success: false, error: err.message };
    }

    // Test storage access
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      testResults.storageAccess = error ? 
        { success: false, error: error.message } : 
        { success: true, buckets: buckets?.map(b => b.name) };
    } catch (err: any) {
      testResults.storageAccess = { success: false, error: err.message };
    }

    // Test campaign-photos bucket specifically
    try {
      const { data: files, error } = await supabase.storage
        .from('campaign-photos')
        .list('', { limit: 1 });
      
      testResults.campaignPhotosBucket = error ? 
        { success: false, error: error.message } : 
        { success: true, fileCount: files?.length || 0 };
    } catch (err: any) {
      testResults.campaignPhotosBucket = { success: false, error: err.message };
    }

    setResults(testResults);
    setTesting(false);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-blue-800">🔧 Supabase Debug Panel</h3>
        <button
          onClick={testConnection}
          disabled={testing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
      
      {results && (
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold text-blue-700">Environment Variables:</h4>
            <pre className="bg-white p-2 border rounded text-xs overflow-auto">
              {JSON.stringify(results.envVars, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold text-blue-700">Database Connection:</h4>
            <pre className="bg-white p-2 border rounded text-xs overflow-auto">
              {JSON.stringify(results.dbConnection, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold text-blue-700">Storage Access:</h4>
            <pre className="bg-white p-2 border rounded text-xs overflow-auto">
              {JSON.stringify(results.storageAccess, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold text-blue-700">Campaign Photos Bucket:</h4>
            <pre className="bg-white p-2 border rounded text-xs overflow-auto">
              {JSON.stringify(results.campaignPhotosBucket, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
