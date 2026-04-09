import { createBotSupabaseClient } from "./supabase";

type UserRecord = {
  id: string;
  name: string;
};

type AttendanceRecord = {
  id: string;
  user_id: string;
  target_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
  status: "working" | "on_break" | "finished";
  guild_id: string | null;
};

type BreakRecord = {
  attendance_id: string;
  break_start_at: string;
  break_end_at: string | null;
};

type CommandResult = { ok: true; message: string } | { ok: false; message: string };

function buildSuccess(message: string): CommandResult {
  return { ok: true, message };
}

function buildFailure(message: string): CommandResult {
  return { ok: false, message };
}

function getNowInJst() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

function getJstDateString() {
  return getNowInJst().toISOString().slice(0, 10);
}

function getBreakMinutes(row: BreakRecord) {
  if (!row.break_end_at) return 0;
  const start = new Date(row.break_start_at).getTime();
  const end = new Date(row.break_end_at).getTime();
  const diff = Math.floor((end - start) / (1000 * 60));
  return diff > 0 ? diff : 0;
}

async function resolveUserByDiscordId(discordUserId: string) {
  const supabase = createBotSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id,name")
    .eq("discord_id", discordUserId)
    .maybeSingle<UserRecord>();

  if (error) throw error;
  return data;
}

async function getTodayAttendance(userId: string, guildId: string) {
  const supabase = createBotSupabaseClient();
  const today = getJstDateString();
  const { data, error } = await supabase
    .from("attendances")
    .select("id,user_id,target_date,clock_in_at,clock_out_at,status,guild_id")
    .eq("user_id", userId)
    .eq("guild_id", guildId)
    .eq("target_date", today)
    .maybeSingle<AttendanceRecord>();

  if (error) throw error;
  return data;
}

async function getOpenBreak(attendanceId: string) {
  const supabase = createBotSupabaseClient();
  const { data, error } = await supabase
    .from("breaks")
    .select("attendance_id,break_start_at,break_end_at")
    .eq("attendance_id", attendanceId)
    .is("break_end_at", null)
    .order("break_start_at", { ascending: false })
    .limit(1)
    .maybeSingle<BreakRecord>();

  if (error) throw error;
  return data;
}

export async function getAttendanceSummary(discordUserId: string, guildId: string): Promise<CommandResult> {
  const user = await resolveUserByDiscordId(discordUserId);
  if (!user) {
    return buildFailure("Webで先にログインして users レコードを作成してください。");
  }

  const attendance = await getTodayAttendance(user.id, guildId);
  if (!attendance) {
    return buildSuccess(`${user.name} さんは本日の打刻がまだありません。`);
  }

  return buildSuccess(
    `${user.name} さんの現在の状態: ${attendance.status} / 出勤 ${new Date(attendance.clock_in_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`
  );
}

export async function startAttendance(discordUserId: string, guildId: string): Promise<CommandResult> {
  const user = await resolveUserByDiscordId(discordUserId);
  if (!user) {
    return buildFailure("Webで先にログインして users レコードを作成してください。");
  }

  const existing = await getTodayAttendance(user.id, guildId);
  if (existing) {
    return buildFailure(`既に今日の勤怠があります。状態: ${existing.status}`);
  }

  const supabase = createBotSupabaseClient();
  const { error } = await supabase.from("attendances").insert({
    user_id: user.id,
    guild_id: guildId,
    target_date: getJstDateString(),
    clock_in_at: getNowInJst().toISOString(),
    clock_out_at: null,
    status: "working"
  });

  if (error) return buildFailure(`出勤打刻に失敗しました: ${error.message}`);
  return buildSuccess(`${user.name} さんの出勤を記録しました。`);
}

export async function endAttendance(discordUserId: string, guildId: string): Promise<CommandResult> {
  const user = await resolveUserByDiscordId(discordUserId);
  if (!user) {
    return buildFailure("Webで先にログインして users レコードを作成してください。");
  }

  const supabase = createBotSupabaseClient();
  const attendance = await getTodayAttendance(user.id, guildId);
  if (!attendance) return buildFailure("本日の勤怠が見つかりません。先に出勤してください。");
  if (attendance.clock_out_at) return buildFailure("既に退勤済みです。");

  const openBreak = await getOpenBreak(attendance.id);
  if (openBreak) {
    const { error } = await supabase
      .from("breaks")
      .update({ break_end_at: getNowInJst().toISOString() })
      .eq("attendance_id", openBreak.attendance_id)
      .is("break_end_at", null);
    if (error) return buildFailure(`休憩終了の処理に失敗しました: ${error.message}`);
  }

  const { error } = await supabase
    .from("attendances")
    .update({ clock_out_at: getNowInJst().toISOString(), status: "finished" })
    .eq("id", attendance.id);

  if (error) return buildFailure(`退勤打刻に失敗しました: ${error.message}`);
  return buildSuccess(`${user.name} さんの退勤を記録しました。`);
}

export async function toggleBreak(discordUserId: string, guildId: string): Promise<CommandResult> {
  const user = await resolveUserByDiscordId(discordUserId);
  if (!user) {
    return buildFailure("Webで先にログインして users レコードを作成してください。");
  }

  const supabase = createBotSupabaseClient();
  const attendance = await getTodayAttendance(user.id, guildId);
  if (!attendance) return buildFailure("本日の勤怠が見つかりません。先に出勤してください。");
  if (attendance.clock_out_at) return buildFailure("既に退勤済みです。休憩打刻はできません。");

  if (attendance.status === "working") {
    const { error } = await supabase.from("breaks").insert({
      user_id: user.id,
      attendance_id: attendance.id,
      break_start_at: getNowInJst().toISOString(),
      break_end_at: null
    });
    if (error) return buildFailure(`休憩開始に失敗しました: ${error.message}`);

    const { error: updateError } = await supabase
      .from("attendances")
      .update({ status: "on_break" })
      .eq("id", attendance.id);
    if (updateError) return buildFailure(`状態の更新に失敗しました: ${updateError.message}`);

    return buildSuccess(`${user.name} さんの休憩を開始しました。`);
  }

  const openBreak = await getOpenBreak(attendance.id);
  if (!openBreak) return buildFailure("開始中の休憩が見つかりません。");

  const { error } = await supabase
    .from("breaks")
    .update({ break_end_at: getNowInJst().toISOString() })
    .eq("attendance_id", openBreak.attendance_id)
    .is("break_end_at", null);
  if (error) return buildFailure(`休憩終了に失敗しました: ${error.message}`);

  const { error: updateError } = await supabase
    .from("attendances")
    .update({ status: "working" })
    .eq("id", attendance.id);
  if (updateError) return buildFailure(`状態の更新に失敗しました: ${updateError.message}`);

  return buildSuccess(`${user.name} さんの休憩を終了しました。`);
}

export async function getGuildTeamSummary(guildId: string): Promise<CommandResult> {
  const supabase = createBotSupabaseClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { data: rawAttendances, error: attError } = await supabase
    .from("attendances")
    .select("id,user_id,clock_in_at,clock_out_at")
    .eq("guild_id", guildId)
    .gte("target_date", monthStart);

  if (attError) return buildFailure(`勤怠情報の取得に失敗しました: ${attError.message}`);

  const attendances = rawAttendances ?? [];
  if (attendances.length === 0) return buildSuccess("このサーバーの今月の勤怠はまだありません。");

  const userIds = [...new Set(attendances.map((r) => r.user_id as string))];
  const { data: rawUsers, error: userError } = await supabase
    .from("users")
    .select("id,name")
    .in("id", userIds);
  if (userError) return buildFailure(`ユーザー情報の取得に失敗しました: ${userError.message}`);

  const userNameById = new Map((rawUsers ?? []).map((u) => [u.id as string, u.name as string]));

  const attendanceIds = attendances.map((r) => r.id as string);
  const { data: rawBreaks, error: breaksError } = await supabase
    .from("breaks")
    .select("attendance_id,break_start_at,break_end_at")
    .in("attendance_id", attendanceIds);
  if (breaksError) return buildFailure(`休憩情報の取得に失敗しました: ${breaksError.message}`);

  const breakMinutesById = new Map<string, number>();
  for (const b of (rawBreaks ?? []) as BreakRecord[]) {
    const current = breakMinutesById.get(b.attendance_id) ?? 0;
    breakMinutesById.set(b.attendance_id, current + getBreakMinutes(b));
  }

  const totalsByUser = new Map<string, { name: string; minutes: number; records: number }>();
  for (const row of attendances) {
    const userId = row.user_id as string;
    const clockOut = row.clock_out_at as string | null;
    const workMinutes = clockOut
      ? Math.max(0, Math.floor((new Date(clockOut).getTime() - new Date(row.clock_in_at as string).getTime()) / 60000))
      : 0;
    const netMinutes = Math.max(0, workMinutes - (breakMinutesById.get(row.id as string) ?? 0));
    const current = totalsByUser.get(userId) ?? { name: userNameById.get(userId) ?? userId, minutes: 0, records: 0 };
    totalsByUser.set(userId, { ...current, minutes: current.minutes + netMinutes, records: current.records + 1 });
  }

  const lines = [...totalsByUser.values()]
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10)
    .map((item) => `・${item.name}: ${item.minutes}分（${item.records}件）`);

  return buildSuccess(`このサーバーの今月の勤怠集計\n${lines.join("\n")}`);
}
