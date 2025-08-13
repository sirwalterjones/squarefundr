import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    // Basic validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Message length validation
    if (message.length < 10) {
      return NextResponse.json(
        { error: "Message must be at least 10 characters long" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message must be less than 2000 characters" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Insert the help request
    const { data: helpRequest, error } = await supabase
      .from("help_requests")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        status: "new",
        priority: "normal",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating help request:", error);
      return NextResponse.json(
        { error: "Failed to submit help request. Please try again." },
        { status: 500 }
      );
    }

    console.log("✅ Help request submitted:", {
      id: helpRequest.id,
      name: helpRequest.name,
      email: helpRequest.email,
      subject: helpRequest.subject,
    });

    return NextResponse.json({
      success: true,
      message: "Your help request has been submitted successfully. We'll get back to you soon!",
      id: helpRequest.id,
    });

  } catch (error) {
    console.error("Error in help request API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is an admin
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to check user role (bypasses RLS)
    const adminSupabase = await createAdminSupabaseClient();
    const { data: userRole } = await adminSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!userRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all help requests for admins
    const { data: helpRequests, error } = await supabase
      .from("help_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching help requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch help requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({ helpRequests });

  } catch (error) {
    console.error("Error in help requests GET API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, status, priority, notes, resolved_at } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Help request ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if user is an admin
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to check user role (bypasses RLS)
    const adminSupabase = await createAdminSupabaseClient();
    const { data: userRole } = await adminSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!userRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;
    if (resolved_at !== undefined) updateData.resolved_at = resolved_at;

    // Update the help request
    const { data: helpRequest, error } = await supabase
      .from("help_requests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating help request:", error);
      return NextResponse.json(
        { error: "Failed to update help request" },
        { status: 500 }
      );
    }

    console.log("✅ Help request updated:", {
      id: helpRequest.id,
      status: helpRequest.status,
      priority: helpRequest.priority,
    });

    return NextResponse.json({
      success: true,
      helpRequest,
    });

  } catch (error) {
    console.error("Error in help request PUT API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
