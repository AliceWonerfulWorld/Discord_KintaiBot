# 📁 06_directory.md (ディレクトリ構成図)

---

# 0️⃣ 設計前提

| 項目      | 内容                                 |
| ------- | ---------------------------------- |
| リポジトリ構成 | Monorepo (npm workspaces または Turborepo を想定) |
| アーキテクチャ | Feature-sliced design (Web) / Command-Event (Bot) |
| デプロイ単位  | Web: Vercel (サーバーレス) / Bot: Render等 (常時稼働) |
| 言語      | TypeScript                         |
| MVP方針   | P0機能の実装にフォーカスし、過度なレイヤー分割は避ける |

---

# 1️⃣ 全体構成（Monorepo）

WebアプリとBotで、Supabaseから生成したデータベースの型定義（`types`）を共有できる構成にします。

```text
root/
├── apps/
│   ├── web/           # Next.js (管理画面)
│   └── bot/           # discord.js (Discord Bot本体)
├── packages/
│   ├── shared-types/  # Supabaseの生成型など、共通の型定義
│   └── eslint-config/ # 共通のLinter設定など
├── docs/              # 設計書 (01~08のMarkdown群)
├── .gitignore
├── package.json       # ワークスペース定義
└── README.md
```

---

# 2️⃣ フロントエンド構成（apps/web/）

Next.js (App Router) を採用。MVPとしてスピードを重視しつつ、将来的な拡張を見据えてFeatureベースで関心事を分離します。

```text
apps/web/
├── src/
│   ├── app/               # App Routerのルーティング層 (page.tsx, layout.tsx)
│   │   ├── (auth)/        # ログイン関連画面
│   │   ├── admin/         # チーム管理画面
│   │   └── page.tsx       # ダッシュボード（マイページ）
│   ├── features/          # ドメインごとの機能モジュール
│   │   ├── auth/          # 認証関連 (ログインボタンなど)
│   │   └── attendances/   # 勤怠関連 (一覧表、編集モーダル、打刻API呼び出し)
│   ├── components/        # ドメインに依存しない共通UI (ボタン、モーダル基盤等)
│   ├── lib/               # 外部ライブラリの初期化
│   │   └── supabase/      # Supabase Clientの初期化処理
│   └── types/             # Web専用の型定義
├── public/                # 静的アセット
├── tailwind.config.ts
└── package.json
```

---

# 3️⃣ バックエンド構成（apps/bot/）

`discord.js` を使用したBotの構成です。Discordからの様々なアクション（スラッシュコマンド、ボタン等）をスッキリ処理できるように、ディレクトリを分割します。

```text
apps/bot/
├── src/
│   ├── commands/          # スラッシュコマンドの定義と実行ロジック
│   │   ├── kintai.ts      # /kintai コマンド
│   │   └── status.ts      # /status コマンドなど
│   ├── events/            # Discordのイベントリスナー
│   │   ├── ready.ts       # Bot起動時の処理
│   │   └── interactionCreate.ts # コマンドやボタンが押された時の処理
│   ├── lib/               # 外部連携
│   │   └── supabase.ts    # Supabase Clientの初期化とDB操作ヘルパー
│   ├── utils/             # 時間計算やフォーマット変換などの汎用関数
│   ├── config.ts          # 環境変数の読み込みとバリデーション
│   └── index.ts           # エントリポイント (Botの起動)
├── .env                   # Bot用環境変数 (Discord Token等)
├── tsconfig.json
└── package.json
```

---

# 4️⃣ 共有パッケージ構成（packages/shared-types/）

Supabase CLIを使ってDBスキーマから自動生成した型定義をここに置き、WebとBotの両方からインポートして使います。

```text
packages/shared-types/
├── src/
│   ├── database.types.ts  # Supabase CLIで自動生成された型
│   └── index.ts           # エクスポート用
├── package.json
└── tsconfig.json
```

---

# 5️⃣ ドキュメント構成（docs/）

本プロジェクトの設計書一式を格納します。

```text
docs/
├── 01_feature-list.md       # 機能一覧・優先度
├── 02_tech-stack.md         # 技術スタック
├── 03_screen-flow.md        # 画面遷移・フロー
├── 04_permission-design.md  # 権限設計 (RLS)
├── 05_erd.md                # DBスキーマ・ER図
├── 06_directory.md          # ディレクトリ構成 (本ドキュメント)
├── 07_infrastructure.md     # インフラ設計
└── 08_logging.md            # ログ設計
```