'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    let authListener: any = null;
    
    // Handle Supabase auth session from URL
    const handleAuthSession = async () => {
      try {
        console.log('Current URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        console.log('Search:', window.location.search);
        
        // Check if this is a password recovery session
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const urlParams = new URLSearchParams(window.location.search);
        
        // Log all available parameters
        console.log('Hash params:', Object.fromEntries(hashParams.entries()));
        console.log('URL params:', Object.fromEntries(urlParams.entries()));
        
        // Set up auth state listener for password recovery
        authListener = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state change:', event, session);
          
          if (event === 'PASSWORD_RECOVERY' && session?.access_token) {
            console.log('🔑 Password recovery session detected');
            setAccessToken(session.access_token);
            setMessage('');
          } else if (event === 'SIGNED_IN' && session?.access_token) {
            console.log('🔑 Signed in session detected for recovery');
            setAccessToken(session.access_token);
            setMessage('');
          }
        });
        
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Supabase session:', session);
        console.log('Session error:', error);
        
        // Check for session from various sources
        let foundToken: string | null = null;
        
        if (session?.access_token) {
          foundToken = session.access_token;
          console.log('✅ Token found in session');
        } else if (hashParams.get('access_token')) {
          foundToken = hashParams.get('access_token');
          console.log('✅ Token found in hash');
        } else if (urlParams.get('access_token')) {
          foundToken = urlParams.get('access_token');
          console.log('✅ Token found in URL params');
        }
        
        if (foundToken) {
          setAccessToken(foundToken);
          console.log('🔑 Access token set successfully');
        } else {
          console.log('❌ No token found anywhere');
          
          // Check if we have a type=recovery parameter indicating this is a reset link
          if (hashParams.get('type') === 'recovery' || urlParams.get('type') === 'recovery') {
            console.log('🔄 This is a recovery link, waiting for auth state change...');
            // The auth listener will handle the session when it becomes available
            setTimeout(() => {
              if (!accessToken) {
                console.log('⏰ Timeout: No session found after waiting');
                setMessage('Session expired or invalid. Please request a new password reset link.');
                setIsSuccess(false);
              }
            }, 3000);
          } else {
            setMessage('Invalid or expired reset link. Please request a new password reset.');
            setIsSuccess(false);
          }
        }
      } catch (error) {
        console.error('Auth session error:', error);
        setMessage('Error loading reset session. Please try again.');
        setIsSuccess(false);
      }
    };

    handleAuthSession();
    
    // Cleanup function
    return () => {
      if (authListener) {
        authListener.data?.subscription?.unsubscribe();
      }
    };
  }, [accessToken]);

  const handlePasswordReset = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setMessage('');

    if (!accessToken) {
      setMessage('Invalid reset token. Please request a new password reset.');
      setIsSuccess(false);
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        setMessage(error.message);
        setIsSuccess(false);
      } else {
        setMessage('Password updated successfully! You can now sign in with your new password.');
        setIsSuccess(true);
        
        // Redirect to auth page after 2 seconds
        setTimeout(() => {
          router.push('/auth');
        }, 2000);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setMessage('An unexpected error occurred. Please try again.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6 shadow-lg hover:scale-105 transition-transform duration-200">
            <span className="text-white font-bold text-2xl">SF</span>
          </div>
          <h2 className="text-3xl font-bold text-black mb-2">
            Reset Your Password
          </h2>
          <p className="mt-2 text-gray-600 text-lg">
            Enter your new password below
          </p>
        </div>

        {message && (
          <div className={`text-center p-4 rounded-lg ${
            isSuccess 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {isSuccess && (
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <p className="font-medium">{message}</p>
          </div>
        )}

        {!isSuccess && accessToken && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <form className="space-y-6" onSubmit={handleSubmit(handlePasswordReset)}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    {...register('password')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all duration-200 bg-white"
                    placeholder="Enter new password"
                  />
                  {errors.password && (
                    <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-black mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    {...register('confirmPassword')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all duration-200 bg-white"
                    placeholder="Confirm new password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating Password...
                  </div>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </div>
        )}

        <div className="text-center">
          <Link 
            href="/auth" 
            className="text-black hover:text-gray-700 font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse">
              <span className="text-white font-bold text-2xl">SF</span>
            </div>
            <h2 className="text-3xl font-bold text-black mb-2">Loading...</h2>
            <p className="mt-2 text-gray-600 text-lg">Please wait while we load the reset page</p>
            <div className="mt-6 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
} 