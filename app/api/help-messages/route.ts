import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

// GET - Fetch messages for a help request
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const helpRequestId = searchParams.get("help_request_id");

    if (!helpRequestId) {
      return NextResponse.json(
        { error: "help_request_id parameter is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get messages for the help request
    const { data: messages, error } = await supabase
      .from("help_messages")
      .select("*")
      .eq("help_request_id", helpRequestId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching help messages:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // If table doesn't exist, return empty messages instead of error
      if (error.code === '42P01') {
        console.log("help_messages table doesn't exist yet, returning empty array");
        return NextResponse.json({ messages: [] });
      }
      
      return NextResponse.json(
        { error: "Failed to fetch messages", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages });

  } catch (error) {
    console.error("Error in help messages GET API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// POST - Send a new message in a help request
export async function POST(request: NextRequest) {
  try {
    const { help_request_id, message } = await request.json();

    if (!help_request_id || !message) {
      return NextResponse.json(
        { error: "help_request_id and message are required" },
        { status: 400 }
      );
    }

    if (message.trim().length < 1) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    // If user_roles table doesn't exist, provide helpful error
    if (roleError?.code === '42P01') {
      return NextResponse.json(
        { error: "Help messaging system is not yet set up. Please contact support to complete database setup." },
        { status: 503 }
      );
    }

    const isAdmin = userRole?.role === "admin";

    // Get help request details to verify access and get user info
    const { data: helpRequest, error: helpRequestError } = await supabase
      .from("help_requests")
      .select("*")
      .eq("id", help_request_id)
      .single();

    if (helpRequestError || !helpRequest) {
      // If help_requests table doesn't exist, provide helpful error
      if (helpRequestError?.code === '42P01') {
        return NextResponse.json(
          { error: "Help messaging system is not yet set up. Please contact support to complete database setup." },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: "Help request not found" },
        { status: 404 }
      );
    }

    // For non-admins, verify they own this help request
    if (!isAdmin && helpRequest.email !== (user.email || user.user_metadata?.email)) {
      return NextResponse.json(
        { error: "You can only send messages to your own help requests" },
        { status: 403 }
      );
    }

    // Prepare message data
    const messageData = {
      help_request_id,
      message: message.trim(),
      sender_type: isAdmin ? "admin" : "user",
      sender_user_id: isAdmin ? user.id : null,
      sender_name: isAdmin ? "Admin" : helpRequest.name,
      sender_email: isAdmin ? user.email || "admin@squarefundr.com" : helpRequest.email,
      is_read: false
    };

    // Insert the message
    const { data: newMessage, error: insertError } = await supabase
      .from("help_messages")
      .insert(messageData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating help message:", insertError);
      console.error("Insert error details:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      
      // If table doesn't exist, provide helpful error
      if (insertError.code === '42P01') {
        return NextResponse.json(
          { error: "Help messaging system is not yet set up. Please contact support." },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to send message", details: insertError.message },
        { status: 500 }
      );
    }

    // Update help request status if it was resolved and user is responding
    if (!isAdmin && helpRequest.status === "resolved") {
      await supabase
        .from("help_requests")
        .update({ 
          status: "in_progress",
          resolved_at: null 
        })
        .eq("id", help_request_id);
    }

    console.log("✅ Help message sent:", {
      id: newMessage.id,
      help_request_id,
      sender_type: messageData.sender_type,
      sender_name: messageData.sender_name
    });

    return NextResponse.json({
      success: true,
      message: newMessage
    });

  } catch (error) {
    console.error("Error in help messages POST API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// PUT - Mark messages as read
export async function PUT(request: NextRequest) {
  try {
    const { message_ids } = await request.json();

    if (!message_ids || !Array.isArray(message_ids)) {
      return NextResponse.json(
        { error: "message_ids array is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mark messages as read
    const { error } = await supabase
      .from("help_messages")
      .update({ is_read: true })
      .in("id", message_ids);

    if (error) {
      console.error("Error marking messages as read:", error);
      return NextResponse.json(
        { error: "Failed to mark messages as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error in help messages PUT API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
