import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    month: "2-digit",
    day: "2-digit"
  });
}

function formatDateTime(dateString: string | null) {
  if (!dateString) {
    return "-";
  }

  return new Date(dateString).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}時間${minutes}分`;
}

function formatDurationCell(totalMinutes: number | null) {
  if (totalMinutes === null) {
    return "-";
  }

  return formatDuration(totalMinutes);
}

function statusToJa(status: string) {
  switch (status) {
    case "working":
      return "勤務中";
    case "on_break":
      return "休憩中";
    case "finished":
      return "退勤済";
    default:
      return status;
  }
}

function getWorkedMinutes(row: AttendanceRow) {
  if (!row.clock_out_at) {
    return 0;
  }

  const start = new Date(row.clock_in_at).getTime();
  const end = new Date(row.clock_out_at).getTime();
  const diff = Math.floor((end - start) / (1000 * 60));
  return diff > 0 ? diff : 0;
}

function getBreakMinutes(row: BreakRow) {
  if (!row.break_end_at) {
    return 0;
  }

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

  const totalMinutes = rows.reduce((sum, row) => {
    const workMinutes = getWorkedMinutes(row);
    const breakMinutes = breakMinutesByAttendanceId.get(row.id) ?? 0;
    return sum + Math.max(0, workMinutes - breakMinutes);
  }, 0);

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
            <p className="dash-metric-label">合計勤務時間（表示中）</p>
            <p className="dash-metric-value">{formatDuration(totalMinutes)}</p>
          </article>
          <article className="dash-metric">
            <p className="dash-metric-label">状態フィルタ</p>
            <p className="dash-metric-value">
              {statusFilter === "all" ? "すべて" : statusToJa(statusFilter)}
            </p>
          </article>
        </section>

        <form action="/auth/logout" method="post" className="dash-actions">
          <button type="submit" className="dash-logout">
            ログアウト
          </button>
        </form>
      </section>

      <section className="dash-card dash-attendance">
        <header className="dash-attendance-header">
          <div>
            <p className="dash-kicker">THIS MONTH</p>
            <h2 className="dash-attendance-title">今月の出退勤レコード</h2>
          </div>
          <div className="dash-attendance-controls">
            <span className="dash-attendance-count">{rows.length}件</span>
            <form method="get" className="dash-filter-form">
              <label htmlFor="status" className="dash-filter-label">
                状態
              </label>
              <select id="status" name="status" defaultValue={statusFilter} className="dash-filter-select">
                <option value="all">すべて</option>
                <option value="working">勤務中</option>
                <option value="on_break">休憩中</option>
                <option value="finished">退勤済</option>
              </select>
              <button type="submit" className="dash-filter-button">
                適用
              </button>
            </form>
          </div>
        </header>

        {attendanceError ? (
          <p className="dash-attendance-error">
            勤怠データの取得に失敗しました: {attendanceError.message}
          </p>
        ) : null}

        {!attendanceError && breaksErrorMessage ? (
          <p className="dash-attendance-warn">
            休憩データの取得に失敗したため、勤務時間合計は休憩控除なしで表示される可能性があります: {breaksErrorMessage}
          </p>
        ) : null}

        {!attendanceError && rows.length === 0 ? (
          <article className="dash-empty">
            <p className="dash-empty-title">まだ今月の打刻はありません</p>
            <p className="dash-empty-text">
              Discordで /kintai start を実行すると、ここに記録が表示されます。
            </p>
          </article>
        ) : null}

        {!attendanceError && rows.length > 0 ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>出勤</th>
                  <th>退勤</th>
                  <th>状態</th>
                  <th className="dash-col-duration">正味勤務</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const workedMinutes = getWorkedMinutes(row);
                  const breakMinutes = breakMinutesByAttendanceId.get(row.id) ?? 0;
                  const netMinutes = row.clock_out_at
                    ? Math.max(0, workedMinutes - breakMinutes)
                    : null;

                  return (
                    <tr key={row.id}>
                      <td>{formatDate(row.target_date)}</td>
                      <td>{formatDateTime(row.clock_in_at)}</td>
                      <td>{formatDateTime(row.clock_out_at)}</td>
                      <td>{statusToJa(row.status)}</td>
                      <td className="dash-col-duration">{formatDurationCell(netMinutes)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}

