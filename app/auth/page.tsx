'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Check for URL message parameter and handle password recovery
  useEffect(() => {
    const urlMessage = searchParams.get('message');
    if (urlMessage) {
      setMessage(urlMessage);
      setIsSuccess(false);
    }

    // Check if this is a password recovery redirect
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const urlParams = new URLSearchParams(window.location.search);
    
    if (hashParams.get('type') === 'recovery' || urlParams.get('type') === 'recovery') {
      console.log('Password recovery detected on auth page, redirecting to reset page...');
      // If somehow the user landed on auth page with recovery parameters, redirect to reset page
      router.push('/auth/reset-password' + window.location.hash);
    }
  }, [searchParams, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        // Sign up with Supabase directly
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName || data.email.split('@')[0],
            },
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (authData.user && !authData.session) {
          setMessage('Please check your email to confirm your account before signing in.');
          setIsSuccess(true);
          return;
        }

        setMessage('Account created successfully!');
        setIsSuccess(true);
      } else {
        // Sign in with Supabase directly
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) {
          throw new Error(error.message);
        }

        if (authData.user) {
          setMessage('Signed in successfully!');
          setIsSuccess(true);
          
          // Fast redirect without delay
          router.push('/dashboard');
        } else {
          throw new Error('Authentication failed');
        }
      }

    } catch (error: any) {
      setMessage(error.message || 'An error occurred. Please try again.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (data: { email: string }) => {
    setIsLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: 'https://squarefundr.com/auth/reset-password',
      });

      if (error) {
        setMessage(error.message);
        setIsSuccess(false);
      } else {
        setMessage('Password reset email sent! Check your inbox.');
        setIsSuccess(true);
        setShowResetPassword(false);
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6 shadow-lg hover:scale-105 transition-transform duration-200">
            <span className="text-white font-bold text-2xl">SF</span>
          </div>
          <h2 className="text-3xl font-bold text-black mb-2">
            {isSignUp ? 'Join SquareFundr' : 'Welcome Back'}
          </h2>
          <p className="mt-2 text-gray-600 text-lg">
            {isSignUp 
              ? 'Create your account to start fundraising' 
              : 'Sign in to create and manage your campaigns'
            }
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          {!isSuccess ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
                  Email address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all duration-200 bg-white"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              {isSignUp && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-black mb-2">
                    Full Name
                  </label>
                  <input
                    {...register('fullName')}
                    type="text"
                    autoComplete="name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all duration-200 bg-white"
                    placeholder="Enter your full name"
                  />
                  {errors.fullName && (
                    <p className="text-red-600 text-sm mt-1">{errors.fullName.message}</p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
                  Password
                </label>
                <input
                  {...register('password')}
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all duration-200 bg-white"
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </div>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setShowResetPassword(false);
                    reset();
                    setMessage('');
                  }}
                  className="text-black hover:text-gray-700 text-sm font-medium transition-colors duration-200"
                >
                  {isSignUp 
                    ? "Already have an account? Sign in" 
                    : "Don't have an account? Sign up"
                  }
                </button>
              </div>

              {!isSignUp && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="text-gray-600 hover:text-black text-sm font-medium transition-colors duration-200"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Success!</h3>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
            </div>
          )}

          {message && !isSuccess && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{message}</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            {isSignUp 
              ? 'By creating an account, you agree to our terms of service' 
              : 'Need help? Contact support for assistance'
            }
          </p>
        </div>

        <div className="text-center">
          <Link href="/" className="text-black hover:text-gray-700 font-medium transition-colors duration-200 flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Password Reset Modal */}
        {showResetPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">Reset Password</h3>
                <p className="text-gray-600 text-sm">Enter your email to receive reset instructions</p>
              </div>
              <form onSubmit={handleSubmit(handlePasswordReset)} className="space-y-6">
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-black mb-2">
                    Email Address
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    {...register('email')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all duration-200 bg-white"
                    placeholder="Enter your email address"
                  />
                  {errors.email && (
                    <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Email'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthPageFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse">
            <span className="text-white font-bold text-2xl">SF</span>
          </div>
          <h2 className="text-3xl font-bold text-black mb-2">Loading...</h2>
          <p className="mt-2 text-gray-600 text-lg">Please wait while we load the authentication page</p>
          <div className="mt-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  );
} 