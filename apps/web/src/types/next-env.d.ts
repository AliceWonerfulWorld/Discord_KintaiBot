declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    NEXT_PUBLIC_DISCORD_CLIENT_ID?: string;
    DISCORD_PUBLIC_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    DISCORD_TEAM_VIEWER_ROLE_IDS?: string;
  }
}
