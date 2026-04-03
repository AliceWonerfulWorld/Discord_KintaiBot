import "dotenv/config";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { getBotRuntimeConfig } from "../config";
import { onInteractionCreate } from "../events/interactionCreate";
import { onReady } from "../events/ready";

export async function startBot() {
  const { botToken } = getBotRuntimeConfig();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel]
  });

  client.once("ready", async () => {
    await onReady(client);
  });

  client.on("interactionCreate", async (interaction) => {
    await onInteractionCreate(interaction);
  });

  await client.login(botToken);
}
