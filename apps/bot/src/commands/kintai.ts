import {
  ChatInputCommandInteraction,
  PermissionsBitField,
  SlashCommandBuilder
} from "discord.js";
import {
  endAttendance,
  getGuildTeamSummary,
  startAttendance,
  toggleBreak
} from "../lib/attendance";
import { getBotRuntimeConfig } from "../config";

export const kintaiCommand = new SlashCommandBuilder()
  .setName("kintai")
  .setDescription("勤怠を操作します")
  .addSubcommand((subcommand) =>
    subcommand.setName("start").setDescription("出勤打刻を記録します")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("end").setDescription("退勤打刻を記録します")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("break").setDescription("休憩の開始/終了を切り替えます")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("team").setDescription("このサーバーの今月の勤怠集計を表示します")
  );

async function canViewTeamSummary(interaction: ChatInputCommandInteraction) {
  const isAdmin = interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator);
  if (isAdmin) {
    return true;
  }

  const { teamViewerRoleIds } = getBotRuntimeConfig();
  if (teamViewerRoleIds.length === 0) {
    return false;
  }

  const guild = interaction.guild;
  if (!guild) {
    return false;
  }

  const member = await guild.members.fetch(interaction.user.id);
  return teamViewerRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

export async function handleKintaiCommand(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();
  const discordUserId = interaction.user.id;
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: "⚠️ このコマンドはサーバー内でのみ利用できます。",
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  let result:
    | { ok: true; message: string }
    | { ok: false; message: string };

  switch (subcommand) {
    case "start":
      result = await startAttendance(discordUserId, guildId);
      break;
    case "end":
      result = await endAttendance(discordUserId, guildId);
      break;
    case "break":
      result = await toggleBreak(discordUserId, guildId);
      break;
    case "team":
      if (!(await canViewTeamSummary(interaction))) {
        result = {
          ok: false,
          message:
            "このコマンドは管理者のみ利用できます。必要に応じて DISCORD_TEAM_VIEWER_ROLE_IDS を設定してください。"
        };
        break;
      }

      result = await getGuildTeamSummary(guildId);
      break;
    default:
      result = { ok: false, message: "未対応のサブコマンドです。" };
      break;
  }

  if (result.ok) {
    await interaction.editReply(`✅ ${result.message}`);
    return;
  }

  await interaction.editReply(`⚠️ ${result.message}`);
}
