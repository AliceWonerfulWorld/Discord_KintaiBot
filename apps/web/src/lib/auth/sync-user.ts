import type { SupabaseClient, User } from "@supabase/supabase-js";

type DiscordIdentityData = {
  sub?: string;
};

function getDiscordId(user: User): string | null {
  const discordIdentity = user.identities?.find(
    (identity) => identity.provider === "discord"
  );

  const fromIdentity = (discordIdentity?.identity_data as DiscordIdentityData | undefined)?.sub;
  const fromMetadata =
    typeof user.user_metadata.provider_id === "string"
      ? user.user_metadata.provider_id
      : undefined;

  return fromIdentity ?? fromMetadata ?? null;
}

function getDisplayName(user: User): string {
  const fullName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : undefined;

  const name =
    typeof user.user_metadata.name === "string"
      ? user.user_metadata.name
      : undefined;

  return fullName ?? name ?? user.email ?? user.id;
}

export async function syncCurrentUser(
  supabase: SupabaseClient,
  user: User
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const payload = {
    id: user.id,
    discord_id: getDiscordId(user),
    name: getDisplayName(user)
  };

  const { error } = await supabase.from("users").upsert(payload, {
    onConflict: "id"
  });

  if (error) {
    return { ok: false, reason: error.message };
  }

  return { ok: true };
}
