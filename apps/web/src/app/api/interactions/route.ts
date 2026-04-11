import { verifyDiscordSignature } from "@/lib/discord/verify";
import {
  startAttendance,
  endAttendance,
  toggleBreak,
  getAttendanceSummary,
  getGuildTeamSummary
} from "@/lib/bot/attendance";

// Discord interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;

// Discord response types
const PONG = 1;
const CHANNEL_MESSAGE_WITH_SOURCE = 4;

// Administrator permission bit
const ADMINISTRATOR = BigInt(8);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const IMAGE_URLS: Record<string, string> = {
  start:       `${BASE_URL}/kintai-start.png`,
  end:         `${BASE_URL}/kintai-end.png`,
  break_start: `${BASE_URL}/kintai-break.png`,
  break_end:   `${BASE_URL}/kintai-resume.png`,
};

type DiscordMember = {
  user?: { id: string };
  roles: string[];
  permissions: string;
};

type DiscordInteraction = {
  type: number;
  data?: {
    name: string;
    options?: Array<{ name: string; type: number }>;
  };
  guild_id?: string;
  member?: DiscordMember;
  user?: { id: string };
};

function getUserId(interaction: DiscordInteraction): string | null {
  return interaction.member?.user?.id ?? interaction.user?.id ?? null;
}

function isAdmin(member: DiscordMember): boolean {
  return (BigInt(member.permissions) & ADMINISTRATOR) === ADMINISTRATOR;
}

function canViewTeam(member: DiscordMember): boolean {
  if (isAdmin(member)) return true;
  const roleIds = (process.env.DISCORD_TEAM_VIEWER_ROLE_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return roleIds.some((id) => member.roles.includes(id));
}

function textReply(content: string) {
  return Response.json({
    type: CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content }
  });
}

function embedReply(content: string, imageKey: string) {
  const imageUrl = IMAGE_URLS[imageKey];
  return Response.json({
    type: CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          description: content,
          image: imageUrl ? { url: imageUrl } : undefined,
        }
      ]
    }
  });
}

async function handleKintai(interaction: DiscordInteraction) {
  const guildId = interaction.guild_id;
  if (!guildId) return textReply("⚠️ このコマンドはサーバー内でのみ利用できます。");

  const discordUserId = getUserId(interaction);
  if (!discordUserId) return textReply("⚠️ ユーザー情報が取得できませんでした。");

  const subcommand = interaction.data?.options?.[0]?.name;

  switch (subcommand) {
    case "start": {
      const result = await startAttendance(discordUserId, guildId);
      const prefix = result.ok ? "✅" : "⚠️";
      return result.ok
        ? embedReply(`${prefix} ${result.message}`, "start")
        : textReply(`${prefix} ${result.message}`);
    }
    case "end": {
      const result = await endAttendance(discordUserId, guildId);
      const prefix = result.ok ? "✅" : "⚠️";
      return result.ok
        ? embedReply(`${prefix} ${result.message}`, "end")
        : textReply(`${prefix} ${result.message}`);
    }
    case "break": {
      const result = await toggleBreak(discordUserId, guildId);
      const prefix = result.ok ? "✅" : "⚠️";
      if (!result.ok) return textReply(`${prefix} ${result.message}`);
      const imageKey = result.message.includes("開始") ? "break_start" : "break_end";
      return embedReply(`${prefix} ${result.message}`, imageKey);
    }
    case "team": {
      const member = interaction.member;
      if (!member || !canViewTeam(member)) {
        return textReply("⚠️ このコマンドは管理者のみ利用できます。");
      }
      const result = await getGuildTeamSummary(guildId);
      const prefix = result.ok ? "✅" : "⚠️";
      return textReply(`${prefix} ${result.message}`);
    }
    default:
      return textReply("⚠️ 未対応のサブコマンドです。");
  }
}

async function handleStatus(interaction: DiscordInteraction) {
  const guildId = interaction.guild_id;
  if (!guildId) return textReply("⚠️ このコマンドはサーバー内でのみ利用できます。");

  const discordUserId = getUserId(interaction);
  if (!discordUserId) return textReply("⚠️ ユーザー情報が取得できませんでした。");

  const result = await getAttendanceSummary(discordUserId, guildId);
  const prefix = result.ok ? "ℹ️" : "⚠️";
  return textReply(`${prefix} ${result.message}`);
}

export async function POST(req: Request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const signature = req.headers.get("x-signature-ed25519") ?? "";
  const timestamp = req.headers.get("x-signature-timestamp") ?? "";
  const body = await req.text();

  const isValid = await verifyDiscordSignature(publicKey, signature, timestamp, body);
  if (!isValid) {
    return new Response("Unauthorized", { status: 401 });
  }

  const interaction = JSON.parse(body) as DiscordInteraction;

  if (interaction.type === PING) {
    return Response.json({ type: PONG });
  }

  if (interaction.type === APPLICATION_COMMAND) {
    try {
      switch (interaction.data?.name) {
        case "kintai":
          return await handleKintai(interaction);
        case "status":
          return await handleStatus(interaction);
        default:
          return new Response("Unknown command", { status: 400 });
      }
    } catch (error) {
      console.error("Interaction handler error", error);
      return textReply("⚠️ コマンドの実行に失敗しました。");
    }
  }

  return new Response("Unknown interaction type", { status: 400 });
}
