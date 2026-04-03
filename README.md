# Discord_KintaiBot

チーム開発時に勤怠を管理できる Discord Bot + Web アプリです。

## セットアップ

1. 依存関係をインストール

npm install

2. Web 用環境変数を作成

apps/web/.env.example を apps/web/.env.local にコピーし、以下を設定します。

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

3. 開発サーバーを起動

- Web: npm run dev:web
- Bot: npm run dev:bot

## 認証方式

ユーザー体験は Discord ログインですが、実装は Supabase Auth の Discord OAuth provider を使います。

## Supabase 側の設定

1. Authentication の Providers で Discord を有効化
2. Discord Developer Portal で OAuth2 Redirect URL を設定
3. ローカル開発時は以下を Redirect URL に追加

- http://localhost:3000/auth/callback

本番用 URL も同様に追加してください。

## DB マイグレーション

初期スキーマとRLSは以下のSQLに定義しています。

- supabase/migrations/202604031800_init_kintai_schema.sql

Supabase SQL Editor で適用するか、Supabase CLI を使って適用してください。

例: Supabase CLI を使う場合

1. `supabase login`
2. `supabase link --project-ref <your-project-ref>`
3. `supabase db push`

## Bot 側の環境変数

Bot を動かすときは `apps/bot/.env.example` を参考に以下を設定してください。

- DISCORD_BOT_TOKEN
- DISCORD_CLIENT_ID
- DISCORD_GUILD_ID（開発時は任意。入れるとギルドコマンドとして即反映しやすいです）
- DISCORD_TEAM_VIEWER_ROLE_IDS（任意。`/kintai team` を許可するロールIDをカンマ区切りで指定）
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

`/kintai team` は、Discord サーバー管理者（Administrator）または
`DISCORD_TEAM_VIEWER_ROLE_IDS` で指定したロールを持つメンバーだけ実行できます。

## Bot 招待 URL

Bot を起動すると、起動ログに Discord 招待 URL を出力します。

- scope: `bot applications.commands`
- permissions: `0`

開発時は `DISCORD_GUILD_ID` を設定すると、そのサーバー向けにコマンドが即時登録されやすくなります。
