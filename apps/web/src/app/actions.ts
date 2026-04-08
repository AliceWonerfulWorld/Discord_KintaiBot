"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const VALID_STATUSES = ["working", "on_break", "finished"] as const;
const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toUtcIso(jstDatetimeLocal: string): string {
  // jstDatetimeLocal: "YYYY-MM-DDTHH:mm"
  return new Date(`${jstDatetimeLocal}:00+09:00`).toISOString();
}

function validateInputs(
  targetDate: string,
  clockInJst: string,
  clockOutJst: string,
  status: string
): string | null {
  if (!DATE_RE.test(targetDate)) {
    return "日付の形式が正しくありません。";
  }
  if (!DATETIME_LOCAL_RE.test(clockInJst)) {
    return "出勤時刻の形式が正しくありません。";
  }
  if (clockOutJst && !DATETIME_LOCAL_RE.test(clockOutJst)) {
    return "退勤時刻の形式が正しくありません。";
  }
  if (!(VALID_STATUSES as readonly string[]).includes(status)) {
    return "無効なステータスです。";
  }
  if (clockOutJst && clockOutJst <= clockInJst) {
    return "退勤時刻は出勤時刻より後にしてください。";
  }
  return null;
}

export async function updateAttendance(
  id: string,
  targetDate: string,
  clockInJst: string,
  clockOutJst: string,
  status: string
): Promise<ActionResult> {
  const validationError = validateInputs(targetDate, clockInJst, clockOutJst, status);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "未認証です。" };
  }

  const { error } = await supabase
    .from("attendances")
    .update({
      target_date: targetDate,
      clock_in_at: toUtcIso(clockInJst),
      clock_out_at: clockOutJst ? toUtcIso(clockOutJst) : null,
      status
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  return { ok: true, message: "更新しました。" };
}

export async function createAttendance(
  targetDate: string,
  clockInJst: string,
  clockOutJst: string,
  status: string
): Promise<ActionResult> {
  const validationError = validateInputs(targetDate, clockInJst, clockOutJst, status);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "未認証です。" };
  }

  const { error } = await supabase.from("attendances").insert({
    user_id: user.id,
    target_date: targetDate,
    clock_in_at: toUtcIso(clockInJst),
    clock_out_at: clockOutJst ? toUtcIso(clockOutJst) : null,
    status
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  return { ok: true, message: "追加しました。" };
}
