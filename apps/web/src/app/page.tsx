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

  return (
    <main className="container">
      <h1>Discord Kintai Bot</h1>
      <p>ログイン中: {user.user_metadata.full_name ?? user.email ?? user.id}</p>
      <p>Discord OAuth (Supabase Auth経由) で認証できています。</p>

      <form action="/auth/logout" method="post">
        <button type="submit">ログアウト</button>
      </form>
    </main>
  );
}

