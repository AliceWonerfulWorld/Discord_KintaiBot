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
