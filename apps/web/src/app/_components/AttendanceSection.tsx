"use client";

import { useState, useTransition } from "react";
import { updateAttendance, createAttendance } from "@/app/actions";

export type AttendanceRowProps = {
  id: string;
  target_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
  status: string;
  breakMinutes: number;
  netMinutes: number | null;
};

type Props = {
  rows: AttendanceRowProps[];
  totalMinutes: number;
  statusFilter: string;
  error: string | null;
  warnMessage: string | null;
};

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; row: AttendanceRowProps }
  | null;

// --- Helpers ---

function toJstDatetimeLocal(utcStr: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
    .format(new Date(utcStr))
    .replace(" ", "T");
}

function todayJst(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function nowJstDatetimeLocal(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
    .format(new Date())
    .replace(" ", "T");
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    month: "2-digit",
    day: "2-digit"
  });
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return "-";
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
  if (totalMinutes === null) return "-";
  return formatDuration(totalMinutes);
}

function statusToJa(status: string) {
  switch (status) {
    case "working": return "勤務中";
    case "on_break": return "休憩中";
    case "finished": return "退勤済";
    default: return status;
  }
}

// --- Modal Form ---

function AttendanceModal({
  modal,
  onClose
}: {
  modal: ModalState;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!modal) return null;

  const isEdit = modal.mode === "edit";
  const row = isEdit ? modal.row : null;

  const initialClockIn = row ? toJstDatetimeLocal(row.clock_in_at) : nowJstDatetimeLocal();
  const initialClockOut = row?.clock_out_at ? toJstDatetimeLocal(row.clock_out_at) : "";
  const initialDate = row ? row.target_date : todayJst();
  const initialStatus = row ? row.status : "working";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const els = e.currentTarget.elements;
    const targetDate = (els.namedItem("target_date") as HTMLInputElement).value;
    const clockIn = (els.namedItem("clock_in_at") as HTMLInputElement).value;
    const clockOut = (els.namedItem("clock_out_at") as HTMLInputElement).value;
    const status = (els.namedItem("status") as HTMLSelectElement).value;

    setErrorMessage(null);

    startTransition(async () => {
      const result = isEdit && row
        ? await updateAttendance(row.id, targetDate, clockIn, clockOut, status)
        : await createAttendance(targetDate, clockIn, clockOut, status);

      if (result.ok) {
        onClose();
      } else {
        setErrorMessage(result.message);
      }
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <dialog
        open
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 className="modal-title">
            {isEdit ? "打刻を編集" : "打刻を追加"}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-field">
            <span className="modal-label">日付</span>
            <input
              type="date"
              name="target_date"
              defaultValue={initialDate}
              required
              className="modal-input"
            />
          </label>

          <label className="modal-field">
            <span className="modal-label">出勤時刻 (JST)</span>
            <input
              type="datetime-local"
              name="clock_in_at"
              defaultValue={initialClockIn}
              required
              className="modal-input"
            />
          </label>

          <label className="modal-field">
            <span className="modal-label">退勤時刻 (JST)</span>
            <input
              type="datetime-local"
              name="clock_out_at"
              defaultValue={initialClockOut}
              className="modal-input"
            />
            <span className="modal-hint">未退勤の場合は空欄</span>
          </label>

          <label className="modal-field">
            <span className="modal-label">状態</span>
            <select
              name="status"
              defaultValue={initialStatus}
              required
              className="modal-input"
            >
              <option value="working">勤務中</option>
              <option value="on_break">休憩中</option>
              <option value="finished">退勤済</option>
            </select>
          </label>

          {errorMessage ? (
            <p className="modal-error">{errorMessage}</p>
          ) : null}

          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn-cancel"
              onClick={onClose}
              disabled={isPending}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="modal-btn-submit"
              disabled={isPending}
            >
              {isPending ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

// --- Main Component ---

export function AttendanceSection({
  rows,
  totalMinutes,
  statusFilter,
  error,
  warnMessage
}: Props) {
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <>
      <section className="dash-card dash-attendance">
        <header className="dash-attendance-header">
          <div>
            <p className="dash-kicker">THIS MONTH</p>
            <h2 className="dash-attendance-title">今月の出退勤レコード</h2>
          </div>
          <div className="dash-attendance-controls">
            <div className="dash-attendance-top-row">
              <span className="dash-attendance-count">{rows.length}件</span>
              <button
                type="button"
                className="dash-add-btn"
                onClick={() => setModal({ mode: "create" })}
              >
                + 打刻を追加
              </button>
            </div>
            <form method="get" className="dash-filter-form">
              <label htmlFor="status" className="dash-filter-label">
                状態
              </label>
              <select
                id="status"
                name="status"
                defaultValue={statusFilter}
                className="dash-filter-select"
              >
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

        {error ? (
          <p className="dash-attendance-error">
            勤怠データの取得に失敗しました: {error}
          </p>
        ) : null}

        {!error && warnMessage ? (
          <p className="dash-attendance-warn">
            休憩データの取得に失敗したため、勤務時間合計は休憩控除なしで表示される可能性があります: {warnMessage}
          </p>
        ) : null}

        {!error && rows.length === 0 ? (
          <article className="dash-empty">
            <p className="dash-empty-title">まだ今月の打刻はありません</p>
            <p className="dash-empty-text">
              Discordで /kintai start を実行すると、ここに記録が表示されます。
            </p>
          </article>
        ) : null}

        {!error && rows.length > 0 ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>出勤</th>
                  <th>退勤</th>
                  <th>状態</th>
                  <th className="dash-col-duration">正味勤務</th>
                  <th className="dash-col-action" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.target_date)}</td>
                    <td>{formatDateTime(row.clock_in_at)}</td>
                    <td>{formatDateTime(row.clock_out_at)}</td>
                    <td>{statusToJa(row.status)}</td>
                    <td className="dash-col-duration">
                      {formatDurationCell(row.netMinutes)}
                    </td>
                    <td className="dash-col-action">
                      <button
                        type="button"
                        className="dash-edit-btn"
                        onClick={() => setModal({ mode: "edit", row })}
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="dash-total-label">
                    合計勤務時間
                  </td>
                  <td className="dash-col-duration dash-total-value">
                    {formatDuration(totalMinutes)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : null}
      </section>

      <AttendanceModal modal={modal} onClose={() => setModal(null)} />
    </>
  );
}
