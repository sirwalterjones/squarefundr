import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabaseServer";
export const runtime = "nodejs";

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

    // Use service-role admin client
    const adminSupabase = await createAdminSupabaseClient();

    // Get all users
    const { data: allUsers, error: usersError } = await adminSupabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching users for global message:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Create help_request records for all users (delivery channel)
    const helpRecords = allUsers.users.map(targetUser => ({
      name: "Admin",
      email: targetUser.email,
      subject: `[ANNOUNCEMENT] ${subject}`,
      message,
      status: "new",
      priority: "normal",
    }));

    // Insert all messages in batches to avoid payload limits
    const batchSize = 100;
    let totalSent = 0;
    let errors: string[] = [];

    for (let i = 0; i < helpRecords.length; i += batchSize) {
      const batch = helpRecords.slice(i, i + batchSize);
      
      try {
        const { data: insertedMessages, error: insertError } = await adminSupabase
          .from("help_requests")
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
          totalUsers: helpRecords.length,
          sent: totalSent,
          errors: errors
        }
      }, { status: 207 }); // 207 Multi-Status
    }

    console.log(`🎉 Global message "${subject}" sent to ${totalSent} users successfully`);

    return NextResponse.json({
      success: true,
      message: `Global message sent to ${totalSent} users successfully (via help requests)`,
      data: {
        totalUsers: helpRecords.length,
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
