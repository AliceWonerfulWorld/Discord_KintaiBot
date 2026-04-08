"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

function toUtcIso(jstDatetimeLocal: string): string {
  // jstDatetimeLocal: "YYYY-MM-DDTHH:mm"
  return new Date(`${jstDatetimeLocal}:00+09:00`).toISOString();
}

export async function updateAttendance(
  id: string,
  targetDate: string,
  clockInJst: string,
  clockOutJst: string,
  status: string
): Promise<ActionResult> {
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
