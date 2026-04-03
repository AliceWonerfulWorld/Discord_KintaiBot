import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!hasSupabaseEnv()) {
    redirect("/setup");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-stage">
        <article className="auth-hero">
          <p className="auth-kicker">TIMEKEEPER PORTAL</p>
          <h1 className="auth-title">Discord から始まる、軽快な勤怠フロー。</h1>
          <p className="auth-lead">
            ログインは Discord アカウントをそのまま利用します。認証後は、
            あなた専用の勤怠ダッシュボードへ自動で移動します。
          </p>

          <ul className="auth-points">
            <li>Bot と Web を同じアカウントで一貫管理</li>
            <li>Supabase RLS によるレコード保護</li>
            <li>打刻ミスの修正もブラウザで完結</li>
          </ul>
        </article>

        <article className="auth-card">
          <p className="auth-card-label">Discord OAuth</p>
          <h2 className="auth-card-title">サインイン</h2>
          <p className="auth-card-text">
            認証は Supabase Auth 経由で安全に処理されます。
          </p>

          <form action="/auth/login" method="post">
            <button type="submit" className="auth-button">
              <span className="auth-button-dot" />
              Discordでログイン
            </button>
          </form>

          {params.error ? (
            <p className="auth-error">認証に失敗しました: {params.error}</p>
          ) : null}
        </article>
      </section>
    </main>
  );
}
