import { Interaction } from "discord.js";
import { handleKintaiCommand, kintaiCommand } from "../commands/kintai";
import { handleStatusCommand, statusCommand } from "../commands/status";

export async function onInteractionCreate(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName === kintaiCommand.name) {
    await handleKintaiCommand(interaction);
    return;
  }

  if (interaction.commandName === statusCommand.name) {
    await handleStatusCommand(interaction);
    return;
  }
}
