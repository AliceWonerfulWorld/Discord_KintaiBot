import { Client } from "discord.js";
import { kintaiCommand } from "../commands/kintai";
import { statusCommand } from "../commands/status";
import { getBotRuntimeConfig } from "../config";
import { createBotInviteUrl } from "../lib/invite";

export async function onReady(client: Client) {
  const { guildId, clientId } = getBotRuntimeConfig();
  const commands = [kintaiCommand.toJSON(), statusCommand.toJSON()];
  const inviteUrl = createBotInviteUrl(clientId);

  if (guildId) {
    const guild = await client.guilds.fetch(guildId);
    await guild.commands.set(commands);
    console.log(`Bot is ready. Registered guild commands for ${guildId}.`);
    console.log(`Invite URL: ${inviteUrl}`);
    return;
  }

  if (client.application) {
    await client.application.commands.set(commands);
    console.log(`Bot is ready. Registered global commands for ${clientId}.`);
    console.log(`Invite URL: ${inviteUrl}`);
    return;
  }

  console.log("Bot is ready but application is unavailable.");
  console.log(`Invite URL: ${inviteUrl}`);
}
