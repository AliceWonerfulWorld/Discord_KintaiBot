export default function SetupPage() {
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
        </article>

        <aside className="setup-panel">
          <h2 className="setup-section-title">Required Keys</h2>
          <ul className="setup-list">
            <li className="setup-item">
              <span className="setup-index">1</span>
              NEXT_PUBLIC_SUPABASE_URL
            </li>
            <li className="setup-item">
              <span className="setup-index">2</span>
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </li>
          </ul>
          <p className="setup-note">
            Placeholder のままでは未設定扱いです。実際のプロジェクト値を入れてください。
          </p>
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
        </article>
      </section>
    </main>
  );
}
