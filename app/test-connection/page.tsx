'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TestConnectionPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [envStatus, setEnvStatus] = useState<any>({});

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Check environment variables
        const envCheck = {
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
          supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
          stripePublishable: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
          siteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
        };
        setEnvStatus(envCheck);

        if (!supabase) {
          setConnectionStatus('❌ Supabase client not initialized');
          return;
        }

        // Test basic connection - try to get auth user (doesn't require tables)
        const { error } = await supabase.auth.getUser();

        if (error && error.message.includes('Invalid API key')) {
          setConnectionStatus('❌ Invalid Supabase credentials');
        } else {
          setConnectionStatus('✅ Connected to Supabase successfully!');
        }
      } catch (error) {
        setConnectionStatus(`❌ Error: ${error}`);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Supabase Connection Test
          </h1>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Connection Status
              </h2>
              <p className="text-lg">{connectionStatus}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Environment Variables
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>NEXT_PUBLIC_SUPABASE_URL:</span>
                  <span className={envStatus.supabaseUrl ? 'text-green-600' : 'text-red-600'}>
                    {envStatus.supabaseUrl ? '✅ Set' : '❌ Missing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
                  <span className={envStatus.supabaseKey ? 'text-green-600' : 'text-red-600'}>
                    {envStatus.supabaseKey ? '✅ Set' : '❌ Missing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:</span>
                  <span className={envStatus.stripePublishable ? 'text-green-600' : 'text-red-600'}>
                    {envStatus.stripePublishable ? '✅ Set' : '❌ Missing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>NEXT_PUBLIC_SITE_URL:</span>
                  <span className={envStatus.siteUrl ? 'text-green-600' : 'text-red-600'}>
                    {envStatus.siteUrl ? '✅ Set' : '❌ Missing'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">
                Configuration Status:
              </h3>
              <div className="text-sm text-blue-700">
                <p>Client available: {supabase ? '✅ Yes' : '❌ No'}</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">
                Setup Instructions:
              </h3>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Make sure your <code>.env.local</code> file is in the project root</li>
                <li>Verify your Supabase URL and anon key are correct</li>
                <li>Make sure there are no extra spaces or line breaks in the values</li>
                <li>Restart the development server after making changes</li>
                <li>Refresh this page to test again</li>
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">
                Don't have Supabase yet?
              </h3>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://supabase.com" target="_blank" className="underline">supabase.com</a></li>
                <li>Create a free account</li>
                <li>Create a new project</li>
                <li>Go to Settings → API to get your keys</li>
                <li>Copy the URL and anon key to your .env.local file</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 