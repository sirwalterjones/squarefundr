import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, isDemoMode } from '@/lib/supabaseClient';
import { cookies } from 'next/headers';

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password }: LoginRequest = await request.json();

    console.log('Login request:', { email, isDemoMode });

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (isDemoMode) {
      console.log('Running in demo mode - returning mock login');
      return NextResponse.json({
        success: true,
        message: 'Demo mode: User would be logged in',
        user: {
          id: 'demo-user-' + Date.now(),
          email,
          full_name: email.split('@')[0]
        }
      });
    }

    // Real login using Supabase Auth
    console.log('Authenticating user...');
    
    const cookieStore = cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    console.log('User logged in successfully:', data.user.id);

    return NextResponse.json({
      success: true,
      message: 'Logged in successfully!',
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || email.split('@')[0]
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('Logout request');

    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        message: 'Demo mode: User would be logged out'
      });
    }

    const cookieStore = cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('User logged out successfully');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully!'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 