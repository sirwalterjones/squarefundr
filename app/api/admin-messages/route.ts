import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

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

    // Insert the message
    console.log("🚀 Attempting to insert message into admin_messages table...");
    const { data: adminMessage, error: insertError } = await supabase
      .from("admin_messages")
      .insert({
        from_admin_id: user.id,
        to_user_id,
        subject,
        message,
        is_read: false
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error sending admin message:", insertError);
      console.error("Insert error details:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      return NextResponse.json(
        { error: "Failed to send message", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
      data: adminMessage
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

    let query = supabase
      .from("admin_messages")
      .select(`
        *,
        from_admin:from_admin_id(email, raw_user_meta_data),
        to_user:to_user_id(email, raw_user_meta_data)
      `)
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
