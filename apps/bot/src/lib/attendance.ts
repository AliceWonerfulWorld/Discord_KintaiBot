import { createSupabaseClient } from "./supabase";
import { getJstDateString, getNowInJst } from "../utils/time";

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

type CommandResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function buildSuccess(message: string): CommandResult {
  return { ok: true, message };
}

function buildFailure(message: string): CommandResult {
  return { ok: false, message };
}

async function resolveUserByDiscordId(discordUserId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id,name")
    .eq("discord_id", discordUserId)
    .maybeSingle<UserRecord>();

  if (error) {
    throw error;
  }

  return data;
}

async function getTodayAttendance(userId: string, guildId: string) {
  const supabase = createSupabaseClient();
  const today = getJstDateString();
  const { data, error } = await supabase
    .from("attendances")
    .select("id,user_id,target_date,clock_in_at,clock_out_at,status,guild_id")
    .eq("user_id", userId)
    .eq("guild_id", guildId)
    .eq("target_date", today)
    .maybeSingle<AttendanceRecord>();

  if (error) {
    throw error;
  }

  return data;
}

async function getOpenBreak(attendanceId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("breaks")
    .select("attendance_id,break_start_at,break_end_at")
    .eq("attendance_id", attendanceId)
    .is("break_end_at", null)
    .order("break_start_at", { ascending: false })
    .limit(1)
    .maybeSingle<BreakRecord>();

  if (error) {
    throw error;
  }

  return data;
}

function getWorkedMinutes(row: Pick<AttendanceRecord, "clock_in_at" | "clock_out_at">) {
  if (!row.clock_out_at) {
    return 0;
  }

  const start = new Date(row.clock_in_at).getTime();
  const end = new Date(row.clock_out_at).getTime();
  const diff = Math.floor((end - start) / (1000 * 60));
  return diff > 0 ? diff : 0;
}

function getBreakMinutes(row: BreakRecord) {
  if (!row.break_end_at) {
    return 0;
  }

  const start = new Date(row.break_start_at).getTime();
  const end = new Date(row.break_end_at).getTime();
  const diff = Math.floor((end - start) / (1000 * 60));
  return diff > 0 ? diff : 0;
}

async function resolveGuildAttendanceRows(guildId: string) {
  const supabase = createSupabaseClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("attendances")
    .select("id,user_id,target_date,clock_in_at,clock_out_at,status,guild_id")
    .eq("guild_id", guildId)
    .gte("target_date", monthStart)
    .order("target_date", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as AttendanceRecord[];
}

export async function getAttendanceSummary(discordUserId: string, guildId: string) {
  const user = await resolveUserByDiscordId(discordUserId);

  if (!user) {
    return buildFailure("Webで先にログインして users レコードを作成してください。Discord ID が見つかりませんでした。");
  }

  const attendance = await getTodayAttendance(user.id, guildId);

  if (!attendance) {
    return buildSuccess(`${user.name} さんは本日の打刻がまだありません。`);
  }

  return buildSuccess(
    `${user.name} さんの現在の状態: ${attendance.status} / 出勤 ${new Date(attendance.clock_in_at).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit"
    })}`
  );
}

export async function startAttendance(discordUserId: string, guildId: string) {
  const user = await resolveUserByDiscordId(discordUserId);

  if (!user) {
    return buildFailure("Webで先にログインして users レコードを作成してください。Discord ID が見つかりませんでした。");
  }

  const supabase = createSupabaseClient();
  const today = getJstDateString();
  const now = getNowInJst().toISOString();

  const existing = await getTodayAttendance(user.id, guildId);

  if (existing) {
    return buildFailure(`既に今日の勤怠があります。状態: ${existing.status}`);
  }

  const { error } = await supabase.from("attendances").insert({
    user_id: user.id,
    guild_id: guildId,
    target_date: today,
    clock_in_at: now,
    clock_out_at: null,
    status: "working"
  });

  if (error) {
    return buildFailure(`出勤打刻に失敗しました: ${error.message}`);
  }

  return buildSuccess(`${user.name} さんの出勤を記録しました。`);
}

export async function endAttendance(discordUserId: string, guildId: string) {
  const user = await resolveUserByDiscordId(discordUserId);

  if (!user) {
    return buildFailure("Webで先にログインして users レコードを作成してください。Discord ID が見つかりませんでした。");
  }

  const supabase = createSupabaseClient();
  const attendance = await getTodayAttendance(user.id, guildId);

  if (!attendance) {
    return buildFailure("本日の勤怠が見つかりません。先に出勤してください。");
  }

  if (attendance.clock_out_at) {
    return buildFailure("既に退勤済みです。");
  }

  const openBreak = await getOpenBreak(attendance.id);

  if (openBreak) {
    const breakClose = await supabase
      .from("breaks")
      .update({ break_end_at: getNowInJst().toISOString() })
      .eq("attendance_id", openBreak.attendance_id)
      .is("break_end_at", null);

    if (breakClose.error) {
      return buildFailure(`休憩終了の処理に失敗しました: ${breakClose.error.message}`);
    }
  }

  const { error } = await supabase
    .from("attendances")
    .update({ clock_out_at: getNowInJst().toISOString(), status: "finished" })
    .eq("id", attendance.id);

  if (error) {
    return buildFailure(`退勤打刻に失敗しました: ${error.message}`);
  }

  return buildSuccess(`${user.name} さんの退勤を記録しました。`);
}

export async function toggleBreak(discordUserId: string, guildId: string) {
  const user = await resolveUserByDiscordId(discordUserId);

  if (!user) {
    return buildFailure("Webで先にログインして users レコードを作成してください。Discord ID が見つかりませんでした。");
  }

  const supabase = createSupabaseClient();
  const attendance = await getTodayAttendance(user.id, guildId);

  if (!attendance) {
    return buildFailure("本日の勤怠が見つかりません。先に出勤してください。");
  }

  if (attendance.clock_out_at) {
    return buildFailure("既に退勤済みです。休憩打刻はできません。");
  }

  if (attendance.status === "working") {
    const { error } = await supabase.from("breaks").insert({
      user_id: user.id,
      attendance_id: attendance.id,
      break_start_at: getNowInJst().toISOString(),
      break_end_at: null
    });

    if (error) {
      return buildFailure(`休憩開始に失敗しました: ${error.message}`);
    }

    const updateResult = await supabase
      .from("attendances")
      .update({ status: "on_break" })
      .eq("id", attendance.id);

    if (updateResult.error) {
      return buildFailure(`勤怠状態の更新に失敗しました: ${updateResult.error.message}`);
    }

    return buildSuccess(`${user.name} さんの休憩を開始しました。`);
  }

  const openBreak = await getOpenBreak(attendance.id);

  if (!openBreak) {
    return buildFailure("開始中の休憩が見つかりません。状態が同期されていない可能性があります。");
  }

  const { error } = await supabase
    .from("breaks")
    .update({ break_end_at: getNowInJst().toISOString() })
    .eq("attendance_id", openBreak.attendance_id)
    .is("break_end_at", null);

  if (error) {
    return buildFailure(`休憩終了に失敗しました: ${error.message}`);
  }

  const updateResult = await supabase
    .from("attendances")
    .update({ status: "working" })
    .eq("id", attendance.id);

  if (updateResult.error) {
    return buildFailure(`勤怠状態の更新に失敗しました: ${updateResult.error.message}`);
  }

  return buildSuccess(`${user.name} さんの休憩を終了しました。`);
}

export async function getGuildTeamSummary(guildId: string) {
  const attendanceRows = await resolveGuildAttendanceRows(guildId);

  if (attendanceRows.length === 0) {
    return buildSuccess("このサーバーの今月の勤怠はまだありません。");
  }

  const supabase = createSupabaseClient();
  const userIds = [...new Set(attendanceRows.map((row) => row.user_id))];
  const { data: rawUserRows, error: userError } = await supabase
    .from("users")
    .select("id,name")
    .in("id", userIds);

  if (userError) {
    return buildFailure(`ユーザー情報の取得に失敗しました: ${userError.message}`);
  }

  const userRows = (rawUserRows ?? []) as Array<{ id: string; name: string }>;
  const userNameById = new Map<string, string>();
  for (const row of userRows) {
    userNameById.set(row.id, row.name);
  }

  const attendanceIds = attendanceRows.map((row) => row.id);
  const { data: rawBreakRows, error: breaksError } = await supabase
    .from("breaks")
    .select("attendance_id,break_start_at,break_end_at")
    .in("attendance_id", attendanceIds);

  if (breaksError) {
    return buildFailure(`休憩情報の取得に失敗しました: ${breaksError.message}`);
  }

  const breakRows = (rawBreakRows ?? []) as Array<BreakRecord>;
  const breakMinutesByAttendanceId = new Map<string, number>();
  for (const breakRow of breakRows) {
    const currentTotal = breakMinutesByAttendanceId.get(breakRow.attendance_id) ?? 0;
    breakMinutesByAttendanceId.set(breakRow.attendance_id, currentTotal + getBreakMinutes(breakRow));
  }

  const totalsByUserId = new Map<string, { name: string; minutes: number; records: number }>();

  for (const row of attendanceRows) {
    const breakMinutes = breakMinutesByAttendanceId.get(row.id) ?? 0;
    const workMinutes = getWorkedMinutes({
      clock_in_at: row.clock_in_at,
      clock_out_at: row.clock_out_at
    });
    const netMinutes = Math.max(0, workMinutes - breakMinutes);
    const current = totalsByUserId.get(row.user_id) ?? {
      name: userNameById.get(row.user_id) ?? row.user_id,
      minutes: 0,
      records: 0
    };

    totalsByUserId.set(row.user_id, {
      name: current.name,
      minutes: current.minutes + netMinutes,
      records: current.records + 1
    });
  }

  const lines = [...totalsByUserId.values()]
    .sort((left, right) => right.minutes - left.minutes)
    .slice(0, 10)
    .map((item) => `・${item.name}: ${item.minutes}分（${item.records}件）`);

  return buildSuccess(`このサーバーの今月の勤怠集計\n${lines.join("\n")}`);
}
