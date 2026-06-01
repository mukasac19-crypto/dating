import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function DELETE() {
  // Authenticate as the logged-in user via their session…
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // …then use the service-role client to actually delete the auth user.
  // Profiles (and every table that references it) cascade on delete, so this
  // removes all of the user's data along with the account.
  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Error deleting user:", deleteError.message);
    return NextResponse.json({ error: "Failed to delete user account." }, { status: 500 });
  }

  return NextResponse.json({ message: "Account deleted successfully" }, { status: 200 });
}
