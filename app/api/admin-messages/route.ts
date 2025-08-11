import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabaseServer";
export const runtime = "nodejs";

// POST - Send a message from admin to user
export async function POST(request: NextRequest) {
  try {
    console.log("🔥 Admin messages API POST called");
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !userRole) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { to_user_id, subject, message } = await request.json();
    console.log("📝 Message data:", { to_user_id, subject, message: message?.substring(0, 50) + "..." });

    if (!to_user_id || !subject || !message) {
      console.log("❌ Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields: to_user_id, subject, message" },
        { status: 400 }
      );
    }

    const adminSupabase = await createAdminSupabaseClient();
    // NEW IMPLEMENTATION: write admin messages as help requests (works reliably)
    const { data: targetUserResp, error: targetUserErr } = await adminSupabase.auth.admin.getUserById(to_user_id);
    if (targetUserErr) {
      console.error("getUserById failed:", targetUserErr);
    }
    const targetEmail = targetUserResp?.user?.email;

    if (!targetEmail) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 400 }
      );
    }

    const { data: helpRow, error: helpErr } = await adminSupabase
      .from("help_requests")
      .insert({
        name: "Admin",
        email: targetEmail,
        subject: `[ADMIN MESSAGE] ${subject}`,
        message,
        status: "new",
        priority: "normal",
      })
      .select()
      .single();

    if (helpErr) {
      console.error("Failed to write admin message into help_requests:", helpErr);
      return NextResponse.json(
        { error: "Failed to send message", details: helpErr.message, debug: { to_user_id, targetUserErr } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Message sent via help requests",
      data: helpRow,
    });

  } catch (error) {
    console.error("Admin messages API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Retrieve messages (for users to see their messages, or admins to see all)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const for_user_id = searchParams.get("for_user_id");

    // Check if user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    const isAdmin = !!userRole;

    // Keep selection minimal to avoid relationship issues without FKs
    let query = supabase
      .from("admin_messages")
      .select("id, from_admin_id, to_user_id, subject, message, is_read, created_at")
      .order("created_at", { ascending: false });

    if (isAdmin && for_user_id) {
      // Admin requesting messages for a specific user
      query = query.eq("to_user_id", for_user_id);
    } else if (isAdmin) {
      // Admin requesting all messages
      // No additional filter needed
    } else {
      // Regular user requesting their own messages
      query = query.eq("to_user_id", user.id);
    }

    const { data: messages, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching admin messages:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: messages || []
    });

  } catch (error) {
    console.error("Admin messages GET API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Mark message as read
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { message_id, is_read } = await request.json();

    if (!message_id || typeof is_read !== 'boolean') {
      return NextResponse.json(
        { error: "Missing required fields: message_id, is_read" },
        { status: 400 }
      );
    }

    // Update the message (RLS will ensure user can only update their own messages)
    const { data: updatedMessage, error: updateError } = await supabase
      .from("admin_messages")
      .update({ is_read, updated_at: new Date().toISOString() })
      .eq("id", message_id)
      .eq("to_user_id", user.id) // Extra security check
      .select()
      .single();

    if (updateError) {
      console.error("Error updating message read status:", updateError);
      return NextResponse.json(
        { error: "Failed to update message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Message updated successfully",
      data: updatedMessage
    });

  } catch (error) {
    console.error("Admin messages PUT API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
