import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const url = new URL(request.url);

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(new URL("/setup?error=missing_env", url));
  }

  const supabase = await createServerSupabaseClient();
  const redirectTo = `${url.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo
    }
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=oauth_start_failed", url));
  }

  return NextResponse.redirect(data.url);
}
