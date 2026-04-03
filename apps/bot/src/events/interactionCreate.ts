import { Interaction } from "discord.js";
import { handleKintaiCommand, kintaiCommand } from "../commands/kintai";
import { handleStatusCommand, statusCommand } from "../commands/status";

export async function onInteractionCreate(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  try {
    if (interaction.commandName === kintaiCommand.name) {
      await handleKintaiCommand(interaction);
      return;
    }

    if (interaction.commandName === statusCommand.name) {
      await handleStatusCommand(interaction);
      return;
    }
  } catch (error) {
    console.error("Failed to handle interaction", error);

    const message = "⚠️ コマンドの実行に失敗しました。";

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message);
      return;
    }

    await interaction.reply({
      content: message,
      ephemeral: true
    });
  }
}
