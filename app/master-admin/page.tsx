import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import MasterAdminClient from "./MasterAdminClient";
import { redirect } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function MasterAdminPage() {
  const supabase = await createServerSupabaseClient();

  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth");
  }

  // Create admin client to check user role
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Check if user has admin role
  const { data: userRole, error: roleError } = await adminSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .single();

  if (roleError || !userRole) {
    // User is not an admin, redirect to dashboard
    redirect("/dashboard");
  }

  return <MasterAdminClient user={user} />;
}
