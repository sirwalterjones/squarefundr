import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabaseServer";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    // Use admin client to avoid RLS latency and ensure deterministic result
    const admin = await createAdminSupabaseClient();
    const { data, error } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (error && (error as any).code !== 'PGRST116') {
      // Non-"no rows" error; still return false but include debug detail for logs
      console.error("/api/is-admin role check error:", error);
    }

    return NextResponse.json({ isAdmin: !!data }, { status: 200 });
  } catch (e) {
    console.error("/api/is-admin unexpected error:", e);
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}


