import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabaseServer";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const res = NextResponse.json({ isAdmin: false }, { status: 200 });
      // Clear cookie if present
      res.cookies.set('sf_is_admin', '', { path: '/', maxAge: 0 });
      return res;
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

    const isAdmin = !!data;
    const res = NextResponse.json({ isAdmin }, { status: 200 });
    // Set short-lived cookie so client can render nav immediately on hard refresh
    if (isAdmin) {
      res.cookies.set('sf_is_admin', '1', { path: '/', maxAge: 60, httpOnly: false, sameSite: 'lax' });
    } else {
      res.cookies.set('sf_is_admin', '', { path: '/', maxAge: 0 });
    }
    return res;
  } catch (e) {
    console.error("/api/is-admin unexpected error:", e);
    const res = NextResponse.json({ isAdmin: false }, { status: 200 });
    res.cookies.set('sf_is_admin', '', { path: '/', maxAge: 0 });
    return res;
  }
}


