import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isDemoMode } from "@/lib/supabaseClient";

interface SignupRequest {
  email: string;
  password: string;
  fullName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName }: SignupRequest = await request.json();

    console.log("Signup request:", { email, fullName, isDemoMode });

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 },
      );
    }

    if (isDemoMode()) {
      console.log("Running in demo mode - returning mock signup");
      return NextResponse.json({
        success: true,
        message: "Demo mode: User would be created",
        user: {
          id: "demo-user-" + Date.now(),
          email,
          full_name: fullName || email.split("@")[0],
        },
      });
    }

    // Real signup using Supabase Auth
    console.log("Creating user account...");

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName || email.split("@")[0],
      },
      email_confirm: true, // Auto-confirm email for now
    });

    if (error) {
      console.error("Signup error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 },
      );
    }

    // Check if user profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", data.user.id)
      .single();

    // Create user profile in public.users table only if it doesn't exist
    if (!existingProfile) {
      const { error: profileError } = await supabaseAdmin.from("users").insert({
        id: data.user.id,
        email: data.user.email!,
        full_name: fullName || email.split("@")[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Don't fail the signup if profile creation fails
        console.log(
          "User created but profile creation failed - user can still proceed",
        );
      } else {
        console.log("User profile created successfully");
      }
    } else {
      console.log("User profile already exists, skipping creation");
    }

    console.log("User created successfully:", data.user.id);

    return NextResponse.json({
      success: true,
      message: "Account created successfully! You can now log in.",
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName || email.split("@")[0],
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
