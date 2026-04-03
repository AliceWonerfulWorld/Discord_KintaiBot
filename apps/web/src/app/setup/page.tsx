import Link from "next/link";
import { getSupabaseSetupStatus } from "@/lib/supabase/env";

function statusLabel(isDone: boolean) {
  return isDone ? "完了" : "未完了";
}

function statusClass(isDone: boolean) {
  return isDone ? "setup-badge setup-badge-done" : "setup-badge setup-badge-pending";
}

export default function SetupPage() {
  const status = getSupabaseSetupStatus();
  const progressPercent = Math.round((status.completedCount / status.totalCount) * 100);

  return (
    <main className="setup-shell">
      <section className="setup-grid">
        <article className="setup-panel">
          <span className="setup-kicker">
            <span className="setup-pulse" />
            BOOTSTRAP REQUIRED
          </span>
          <h1 className="setup-title">認証を始める前に、環境キーを接続しましょう。</h1>
          <p className="setup-lead">
            現在は Supabase の公開設定が未接続です。以下の2つを
            <span className="setup-path">apps/web/.env.local</span>
            に設定すると、Discord OAuth ログインに進めます。
          </p>

          <div className="setup-progress-wrap" aria-label="setup-progress">
            <div className="setup-progress-meta">
              <strong>
                {status.completedCount}/{status.totalCount} 完了
              </strong>
              <span>{progressPercent}%</span>
            </div>
            <div className="setup-progress-bar" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </article>

        <aside className="setup-panel">
          <h2 className="setup-section-title">Setup Status</h2>
          <ul className="setup-list">
            <li className="setup-item">
              <span className="setup-index">1</span>
              <div className="setup-item-body">
                <span>NEXT_PUBLIC_SUPABASE_URL</span>
                <span className={statusClass(status.urlReady)}>{statusLabel(status.urlReady)}</span>
              </div>
            </li>
            <li className="setup-item">
              <span className="setup-index">2</span>
              <div className="setup-item-body">
                <span>NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                <span className={statusClass(status.anonKeyReady)}>{statusLabel(status.anonKeyReady)}</span>
              </div>
            </li>
            <li className="setup-item setup-item-manual">
              <span className="setup-index">3</span>
              <div className="setup-item-body">
                <span>OAuth Redirect URL 登録</span>
                <span className="setup-badge setup-badge-manual">手動確認</span>
              </div>
            </li>
          </ul>
          {!status.envReady ? (
            <p className="setup-note">
              URL または ANON KEY が不足しています。Placeholder のままでも未完了扱いです。
            </p>
          ) : (
            <p className="setup-note setup-note-success">
              環境変数は揃っています。次は OAuth Redirect URL の登録を確認してください。
            </p>
          )}
        </aside>

        <article className="setup-panel">
          <h2 className="setup-section-title">Step 1: .env.local</h2>
          <p className="setup-tip">
            まず
            <span className="setup-path">apps/web/.env.example</span>
            をコピーして
            <span className="setup-path">apps/web/.env.local</span>
            を作成します。
          </p>
          <pre className="setup-code">cp apps/web/.env.example apps/web/.env.local</pre>
        </article>

        <article className="setup-panel">
          <h2 className="setup-section-title">Step 2: OAuth Redirect</h2>
          <p className="setup-tip">
            Supabase と Discord Developer Portal の両方に、次の Redirect URL を登録してください。
          </p>
          <pre className="setup-code">http://localhost:3000/auth/callback</pre>

          {status.envReady ? (
            <p className="setup-next">
              準備ができたので、
              <Link href="/login" className="setup-link">
                ログイン画面へ進む
              </Link>
            </p>
          ) : null}
        </article>
      </section>
    </main>
  );
}
