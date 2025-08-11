import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabaseServer";
export const runtime = "nodejs";

// POST - Send a message from admin to user via help_requests (no RPC)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify admin
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    if (!role) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { to_user_id, subject, message } = await request.json();
    if (!to_user_id || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields: to_user_id, subject, message" }, { status: 400 });
    }

    const admin = await createAdminSupabaseClient();
    const { data: targetUser, error: userErr } = await admin.auth.admin.getUserById(to_user_id);
    if (userErr || !targetUser?.user?.email) {
      return NextResponse.json({ error: "Target user not found" }, { status: 400 });
    }

    const { data: helpRow, error: insertErr } = await admin
      .from("help_requests")
      .insert({
        name: "Admin",
        email: targetUser.user.email,
        subject: `[ADMIN MESSAGE] ${subject}`,
        message,
        status: "new",
        priority: "normal",
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: "Failed to send message", details: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: helpRow });
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - No-op for now (could list sent messages if needed)
export async function GET() {
  return NextResponse.json({ success: true, messages: [] });
}


