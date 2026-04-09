import dotenv from "dotenv";
import path from "path";
import { REST, Routes } from "discord.js";
import { kintaiCommand } from "./commands/kintai";
import { statusCommand } from "./commands/status";
import { getBotRuntimeConfig } from "./config";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function main() {
  const { botToken, clientId, guildId } = getBotRuntimeConfig();
  const rest = new REST().setToken(botToken);
  const commands = [kintaiCommand.toJSON(), statusCommand.toJSON()];

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`✅ Guild commands registered for ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("✅ Global commands registered (反映まで最大1時間かかります)");
  }
}

void main();
