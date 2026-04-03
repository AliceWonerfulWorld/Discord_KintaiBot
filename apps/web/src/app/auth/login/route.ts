import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function startDiscordOAuth(request: Request) {
  const url = new URL(request.url);

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(new URL("/setup?error=missing_env", url), 303);
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
    return NextResponse.redirect(new URL("/login?error=oauth_start_failed", url), 303);
  }

  return NextResponse.redirect(data.url, 303);
}

export async function GET(request: Request) {
  return startDiscordOAuth(request);
}

export async function POST(request: Request) {
  return startDiscordOAuth(request);
}
