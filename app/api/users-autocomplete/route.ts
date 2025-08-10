import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

// GET - Search users for autocomplete (admin only)
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        users: []
      });
    }

    // Use the same approach as master admin users endpoint
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Create admin client for full user access
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all users from auth.users via admin client
    const { data: allUsers, error: usersError } = await adminSupabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Filter users based on search query
    const users = allUsers.users
      .filter(u => {
        const email = u.email || "";
        const name = u.user_metadata?.full_name || u.user_metadata?.name || "";
        const searchLower = query.toLowerCase();
        
        return email.toLowerCase().includes(searchLower) || 
               name.toLowerCase().includes(searchLower);
      })
      .slice(0, 10) // Limit to 10 results
      .map(u => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || "",
        display: `${u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || ""} (${u.email})`
      }));

    return NextResponse.json({
      success: true,
      users: users.slice(0, 10) // Limit to 10 results
    });

  } catch (error) {
    console.error("Users autocomplete API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
