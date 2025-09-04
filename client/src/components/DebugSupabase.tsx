import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export default function DebugSupabase() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runDebug() {
      const info: any = {
        envVars: {
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
          anonKeyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
        }
      };

    // Test basic connection (count)
      try {
        const { count, error } = await supabase
          .from('campaigns')
      .select('*', { count: 'exact', head: true });
        
        if (error) {
          info.connectionTest = { 
            success: false, 
            error: {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            }
          };
        } else {
          info.connectionTest = { success: true, count };
        }
      } catch (err: any) {
        info.connectionTest = { success: false, error: err.message };
      }

      // Test table structure
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .limit(1);
        
        if (error) {
          info.tableTest = { 
            success: false, 
            error: {
              message: error.message,
              code: error.code,
              details: error.details
            }
          };
        } else {
          info.tableTest = { success: true, data };
        }
      } catch (err: any) {
        info.tableTest = { success: false, error: err.message };
      }

      setDebugInfo(info);
      setLoading(false);
    }

    runDebug();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold">🔍 Debug: Testing Supabase Connection...</h3>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded">
      <h3 className="font-bold mb-4">🔍 Supabase Debug Information</h3>
      
      <div className="mb-4">
        <h4 className="font-semibold">Environment Variables:</h4>
        <pre className="text-xs bg-white p-2 border rounded">
          {JSON.stringify(debugInfo.envVars, null, 2)}
        </pre>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold">Connection Test:</h4>
        <pre className="text-xs bg-white p-2 border rounded">
          {JSON.stringify(debugInfo.connectionTest, null, 2)}
        </pre>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold">Table Structure Test:</h4>
        <pre className="text-xs bg-white p-2 border rounded">
          {JSON.stringify(debugInfo.tableTest, null, 2)}
        </pre>
      </div>
    </div>
  );
}
