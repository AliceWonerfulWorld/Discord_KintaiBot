export const botConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development"
};

export function getBotRuntimeConfig() {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID ?? null;
  const teamViewerRoleIds = (process.env.DISCORD_TEAM_VIEWER_ROLE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!botToken) {
    throw new Error("Missing DISCORD_BOT_TOKEN");
  }

  if (!clientId) {
    throw new Error("Missing DISCORD_CLIENT_ID");
  }

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    botToken,
    clientId,
    guildId,
    teamViewerRoleIds,
    supabaseUrl,
    supabaseServiceRoleKey
  };
}
