import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Create server supabase client for auth
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create admin client for role check


    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {


      auth: {


        autoRefreshToken: false,


        persistSession: false,


      },


    });



    // Check if user is admin using admin client


    const { data: userRole, error: roleError } = await adminSupabase


      .from("user_roles")


      .select("role")


      .eq("user_id", user.id)


      .eq("role", "admin")


      .single();

    if (roleError || !userRole) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Continue with admin client for database operations

    // Check if specific user ID is requested
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId) {
      // Get specific user
      const { data: userData, error: userError } =
        await adminSupabase.auth.admin.getUserById(userId);

      if (userError) {
        console.error("Error fetching user:", userError);
        return NextResponse.json(
          { error: "Failed to fetch user" },
          { status: 500 },
        );
      }

      const formattedUser = {
        id: userData.user.id,
        email: userData.user.email || "No email",
        created_at: userData.user.created_at,
        last_sign_in_at: userData.user.last_sign_in_at,
        raw_user_meta_data: userData.user.user_metadata || {},
      };

      return NextResponse.json({ users: [formattedUser] });
    }

    // Get all users from auth.users
    const { data: users, error: usersError } =
      await adminSupabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 },
      );
    }

    // Format users data
    const formattedUsers = users.users.map((user) => ({
      id: user.id,
      email: user.email || "No email",
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      raw_user_meta_data: user.user_metadata || {},
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Master admin users API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, email, full_name } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Create server supabase client for auth
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use existing admin client for role check



    // Check if user is admin using admin client


    const { data: userRole, error: roleError } = await adminSupabase


      .from("user_roles")


      .select("role")


      .eq("user_id", user.id)


      .eq("role", "admin")


      .single();

    if (roleError || !userRole) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Create admin client for database operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Update user
    const updateData: any = {};
    
    if (email) {
      updateData.email = email;
    }
    
    if (full_name !== undefined) {
      updateData.user_metadata = { full_name };
    }

    const { data: updatedUser, error: updateError } =
      await adminSupabase.auth.admin.updateUserById(userId, updateData);

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 },
      );
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        raw_user_meta_data: updatedUser.user.user_metadata || {},
      }
    });
  } catch (error) {
    console.error("Master admin update user API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Create server supabase client for auth
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create admin client for role check


    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {


      auth: {


        autoRefreshToken: false,


        persistSession: false,


      },


    });



    // Check if user is admin using admin client


    const { data: userRole, error: roleError } = await adminSupabase


      .from("user_roles")


      .select("role")


      .eq("user_id", user.id)


      .eq("role", "admin")


      .single();

    if (roleError || !userRole) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Create admin client for database operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Delete user from auth (this will cascade delete their campaigns)
    const { error: deleteError } =
      await adminSupabase.auth.admin.deleteUser(id);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Master admin delete user API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
