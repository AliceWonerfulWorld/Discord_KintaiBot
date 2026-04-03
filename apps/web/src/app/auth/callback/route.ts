import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncCurrentUser } from "@/lib/auth/sync-user";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(new URL("/setup?error=missing_env", requestUrl), 303);
  }

  const supabase = await createServerSupabaseClient();
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", requestUrl), 303);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth_callback_failed", requestUrl), 303);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const syncResult = await syncCurrentUser(supabase, user);

    if (!syncResult.ok) {
      console.warn("User sync failed:", syncResult.reason);
    }
  }

  return NextResponse.redirect(new URL("/", requestUrl), 303);
}
