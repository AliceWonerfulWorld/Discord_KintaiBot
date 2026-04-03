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
    <main className="container">
      <h1>ログイン</h1>
      <p>Discordアカウントで認証します。</p>

      <form action="/auth/login" method="post">
        <button type="submit">Discordでログイン</button>
      </form>

      {params.error ? (
        <p className="error">認証に失敗しました: {params.error}</p>
      ) : null}
    </main>
  );
}
