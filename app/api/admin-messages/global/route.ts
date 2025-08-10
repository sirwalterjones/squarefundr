import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

// POST - Send a global message from admin to all users
export async function POST(request: NextRequest) {
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

    const { subject, message } = await request.json();

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields: subject, message" },
        { status: 400 }
      );
    }

    // Get all users from auth.users via admin client
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all users
    const { data: allUsers, error: usersError } = await adminSupabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching users for global message:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Create message records for all users
    const messageRecords = allUsers.users.map(targetUser => ({
      from_admin_id: user.id,
      to_user_id: targetUser.id,
      subject: `[ANNOUNCEMENT] ${subject}`,
      message,
      is_read: false
    }));

    // Insert all messages in batches to avoid payload limits
    const batchSize = 100;
    let totalSent = 0;
    let errors = [];

    for (let i = 0; i < messageRecords.length; i += batchSize) {
      const batch = messageRecords.slice(i, i + batchSize);
      
      try {
        const { data: insertedMessages, error: insertError } = await supabase
          .from("admin_messages")
          .insert(batch)
          .select();

        if (insertError) {
          console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, insertError);
          const errorMsg = typeof insertError === 'object' && insertError !== null && 'message' in insertError 
            ? String(insertError.message) 
            : 'Unknown error';
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${errorMsg}`);
        } else {
          totalSent += insertedMessages?.length || 0;
          console.log(`✅ Sent global message to ${insertedMessages?.length || 0} users in batch ${Math.floor(i / batchSize) + 1}`);
        }
      } catch (batchError) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, batchError);
        const errorMsg = batchError instanceof Error ? batchError.message : String(batchError);
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${errorMsg}`);
      }
    }

    if (errors.length > 0) {
      console.error("Some global message batches failed:", errors);
      return NextResponse.json({
        success: false,
        error: "Partial failure in sending global messages",
        details: {
          totalUsers: messageRecords.length,
          sent: totalSent,
          errors: errors
        }
      }, { status: 207 }); // 207 Multi-Status
    }

    console.log(`🎉 Global message "${subject}" sent to ${totalSent} users successfully`);

    return NextResponse.json({
      success: true,
      message: `Global message sent to ${totalSent} users successfully`,
      data: {
        totalUsers: messageRecords.length,
        sent: totalSent,
        subject: `[ANNOUNCEMENT] ${subject}`
      }
    });

  } catch (error) {
    console.error("Global messaging API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
