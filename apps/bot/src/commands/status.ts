import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getAttendanceSummary } from "../lib/attendance";

export const statusCommand = new SlashCommandBuilder()
  .setName("status")
  .setDescription("本日の勤怠状態を確認します");

export async function handleStatusCommand(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: "⚠️ このコマンドはサーバー内でのみ利用できます。",
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const result = await getAttendanceSummary(interaction.user.id, guildId);
  const prefix = result.ok ? "ℹ️" : "⚠️";
  await interaction.editReply(`${prefix} ${result.message}`);
}
