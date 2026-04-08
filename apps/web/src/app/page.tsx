import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AttendanceSection } from "@/app/_components/AttendanceSection";
import type { AttendanceRowProps } from "@/app/_components/AttendanceSection";

type AttendanceRow = {
  id: string;
  target_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
  status: string;
};

type BreakRow = {
  attendance_id: string;
  break_start_at: string;
  break_end_at: string | null;
};

const STATUS_OPTIONS = ["all", "working", "on_break", "finished"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}時間${minutes}分`;
}

function getWorkedMinutes(row: AttendanceRow) {
  if (!row.clock_out_at) return 0;
  const start = new Date(row.clock_in_at).getTime();
  const end = new Date(row.clock_out_at).getTime();
  const diff = Math.floor((end - start) / (1000 * 60));
  return diff > 0 ? diff : 0;
}

function getBreakMinutes(row: BreakRow) {
  if (!row.break_end_at) return 0;
  const start = new Date(row.break_start_at).getTime();
  const end = new Date(row.break_end_at).getTime();
  const diff = Math.floor((end - start) / (1000 * 60));
  return diff > 0 ? diff : 0;
}

export default async function Page({ searchParams }: PageProps) {
  if (!hasSupabaseEnv()) {
    redirect("/setup");
  }

  const params = await searchParams;
  const rawStatus = params.status;
  const statusFilter: StatusFilter = STATUS_OPTIONS.includes(rawStatus as StatusFilter)
    ? (rawStatus as StatusFilter)
    : "all";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName = user.user_metadata.full_name ?? user.email ?? user.id;
  const initial = displayName.charAt(0).toUpperCase();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  let attendanceQuery = supabase
    .from("attendances")
    .select("id,target_date,clock_in_at,clock_out_at,status")
    .eq("user_id", user.id)
    .gte("target_date", monthStart)
    .lte("target_date", monthEnd)
    .order("target_date", { ascending: false });

  if (statusFilter !== "all") {
    attendanceQuery = attendanceQuery.eq("status", statusFilter);
  }

  const { data: attendanceRows, error: attendanceError } = await attendanceQuery;
  const rows = (attendanceRows ?? []) as AttendanceRow[];
  const attendanceIds = rows.map((row) => row.id);
  const breakMinutesByAttendanceId = new Map<string, number>();
  let breaksErrorMessage: string | null = null;

  if (attendanceIds.length > 0) {
    const { data: breakRows, error: breaksError } = await supabase
      .from("breaks")
      .select("attendance_id,break_start_at,break_end_at")
      .eq("user_id", user.id)
      .in("attendance_id", attendanceIds);

    if (breaksError) {
      breaksErrorMessage = breaksError.message;
    } else {
      for (const breakRow of (breakRows ?? []) as BreakRow[]) {
        const currentTotal = breakMinutesByAttendanceId.get(breakRow.attendance_id) ?? 0;
        breakMinutesByAttendanceId.set(
          breakRow.attendance_id,
          currentTotal + getBreakMinutes(breakRow)
        );
      }
    }
  }

  const enrichedRows: AttendanceRowProps[] = rows.map((row) => {
    const workedMinutes = getWorkedMinutes(row);
    const breakMinutes = breakMinutesByAttendanceId.get(row.id) ?? 0;
    const netMinutes = row.clock_out_at ? Math.max(0, workedMinutes - breakMinutes) : null;
    return { ...row, breakMinutes, netMinutes };
  });

  const totalMinutes = enrichedRows.reduce((sum, row) => sum + (row.netMinutes ?? 0), 0);

  return (
    <main className="dash-shell">
      <section className="dash-card">
        <header className="dash-header">
          <div>
            <p className="dash-kicker">SESSION ACTIVE</p>
            <h1 className="dash-title">Discord Kintai Bot</h1>
            <p className="dash-lead">認証済みのセッションでダッシュボードを利用できます。</p>
          </div>
          <span className="dash-badge">ONLINE</span>
        </header>

        <article className="dash-user">
          <div className="dash-avatar" aria-hidden>
            {initial}
          </div>
          <div>
            <p className="dash-user-name">{displayName}</p>
            <p className="dash-user-id">user_id: {user.id}</p>
          </div>
        </article>

        <section className="dash-grid">
          <article className="dash-metric">
            <p className="dash-metric-label">Auth Provider</p>
            <p className="dash-metric-value">Discord</p>
          </article>
          <article className="dash-metric">
            <p className="dash-metric-label">Session Route</p>
            <p className="dash-metric-value">Supabase OAuth Callback</p>
          </article>
          <article className="dash-metric">
            <p className="dash-metric-label">合計勤務時間（今月）</p>
            <p className="dash-metric-value">{formatDuration(totalMinutes)}</p>
          </article>
          <article className="dash-metric">
            <p className="dash-metric-label">状態フィルタ</p>
            <p className="dash-metric-value">
              {statusFilter === "all" ? "すべて" : statusFilter}
            </p>
          </article>
        </section>

        <form action="/auth/logout" method="post" className="dash-actions">
          <button type="submit" className="dash-logout">
            ログアウト
          </button>
        </form>
      </section>

      <AttendanceSection
        rows={enrichedRows}
        totalMinutes={totalMinutes}
        statusFilter={statusFilter}
        error={attendanceError?.message ?? null}
        warnMessage={breaksErrorMessage}
      />
    </main>
  );
}
