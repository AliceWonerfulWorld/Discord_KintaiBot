import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Page() {
  if (!hasSupabaseEnv()) {
    redirect("/setup");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName = user.user_metadata.full_name ?? user.email ?? user.id;
  const initial = displayName.charAt(0).toUpperCase();

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
        </section>

        <form action="/auth/logout" method="post" className="dash-actions">
          <button type="submit" className="dash-logout">
            ログアウト
          </button>
        </form>
      </section>
    </main>
  );
}

