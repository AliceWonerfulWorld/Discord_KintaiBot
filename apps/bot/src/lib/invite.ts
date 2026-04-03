export function createBotInviteUrl(clientId: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot applications.commands",
    permissions: "0"
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
