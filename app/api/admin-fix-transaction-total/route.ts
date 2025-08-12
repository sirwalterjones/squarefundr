import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transaction_id");
    const totalParam = searchParams.get("total");

    if (!transactionId || !totalParam) {
      return NextResponse.json(
        { error: "transaction_id and total are required" },
        { status: 400 }
      );
    }

    const newTotal = Number(totalParam);
    if (!Number.isFinite(newTotal) || newTotal < 0) {
      return NextResponse.json(
        { error: "total must be a positive number" },
        { status: 400 }
      );
    }

    // Verify requester is authenticated admin
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleRow) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Update using service role
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: updated, error: updateError } = await adminSupabase
      .from("transactions")
      .update({ total: newTotal })
      .eq("id", transactionId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update total", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Admin fix total API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


