# ☁️ 07_infrastructure.md (インフラ設計書)

---

# 0️⃣ 設計前提

| 項目      | 内容                                 |
| ------- | ---------------------------------- |
| インフラ方針 | PaaS / BaaS の完全無料枠を組み合わせた構成 |
| ホスティング | Web: Vercel (Serverless) / Bot: Render or Fly.io (Container) |
| データベース | Supabase (PostgreSQL) |
| 認証基盤   | Supabase Auth (Discord OAuth連携) |
| スケール方針 | 基本は各プロバイダのマネージドに依存（MVPフェーズではスケーリングよりコスト0を優先） |

---

# 1️⃣ System Architecture

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "background": "#FFFFFF",
    "primaryColor": "#EEF5FF",
    "primaryTextColor": "#0A2540",
    "primaryBorderColor": "#3572EF",
    "lineColor": "#6B7280",
    "tertiaryColor": "#F6FAFF"
  },
  "flowchart": { "curve": "basis", "nodeSpacing": 60, "rankSpacing": 80 }
}}%%
flowchart LR

    %% =======================
    %% Edge Layer (Vercel)
    %% =======================
    subgraph EDGE["Edge Layer (Vercel)"]
        CDN["Vercel Edge Network"]:::edge
    end

    %% =======================
    %% Application Layer
    %% =======================
    subgraph APP["Application Layer"]
        WEB["Next.js Web App<br/>(Vercel Serverless)"]:::app
        BOT["Discord Bot<br/>(Render / Fly.io)"]:::app
    end

    %% =======================
    %% BaaS / Data Layer (Supabase)
    %% =======================
    subgraph SUPABASE["BaaS / Data Layer (Supabase)"]
        AUTH["Supabase Auth<br/>(Identity Provider)"]:::svc
        DB["PostgreSQL<br/>(Primary RDB)"]:::db
    end

    %% =======================
    %% External Services
    %% =======================
    DISCORD["Discord API / Gateway"]:::entry

    %% =======================
    %% 接続
    %% =======================
    Client((User)) --> CDN
    CDN --> WEB
    WEB --> AUTH
    WEB --> DB
    
    DISCORD <-->|WebSocket / Webhook| BOT
    BOT --> DB
    AUTH --> DISCORD : "OAuth2 Login"

    %% =======================
    %% Class Definitions
    %% =======================
    classDef edge fill:#fff2e6,stroke:#ff7a00,color:#4a2f00;
    classDef svc fill:#eef9f1,stroke:#2a9d8f,color:#073b4c;
    classDef app fill:#e8f1ff,stroke:#3572ef,color:#0a2540;
    classDef entry fill:#eaf7ff,stroke:#0091d5,color:#073b4c;
    classDef db fill:#f5faff,stroke:#2b6cb0,color:#0a2a4a;
```

---

# 2️⃣ System Components

---

## 1. Edge Layer

### Vercel Edge Network
* **役割:** Web画面（Next.js）の静的アセット配信、ルーティング、キャッシュ。
* **メリット:** ユーザーに最も近いエッジサーバーから応答するため、管理画面のロード時間が極めて短くなる。

---

## 2. Application Layer

### Next.js Web App (Vercel Serverless)
* **役割:** 勤怠データの閲覧・編集を行うWeb管理画面。
* **特性:** リクエストが来たときだけ起動するサーバーレス環境。Supabaseと直接通信し、データの取得や更新を行う。

### Discord Bot (Render または Fly.io)
* **役割:** Discord上で `/kintai` スラッシュコマンドを受け取り、DBに打刻データを書き込む。
* **特性:** Discordからのイベントを待ち受けるため、**常時稼働（Long-running process）**が必要。Vercelのようなサーバーレスではなく、コンテナ環境で動かす。

---

## 3. BaaS / Identity Layer

### Supabase Auth
* **役割:** ユーザーの認証（Discordアカウントでのログイン）とセッション管理。
* **特性:** 認証が通るとJWTが発行され、このトークンを使って直接データベースにアクセスできる（アプリケーション側での複雑な認証ミドルウェアが不要になる）。

---

## 4. Data Layer

### Supabase PostgreSQL
* **役割:** ユーザー情報、勤怠データ、休憩データの保存。
* **特性:** RLS（Row Level Security）によって、データベース層で直接「誰がどのデータを操作できるか」を制御する。これにより、サーバー側のコードを大幅に削減できる。

---

# 3️⃣ 設計意図

---

## 運用コスト「完全無料」の実現
個人開発や小規模チームでの導入ハードルを下げるため、ランニングコストを0円に抑える構成を採用。
* Webフロントエンド：Vercel（Hobbyプラン無料）
* バックエンドBot：Render（Freeプラン）または Fly.io（Hobbyプラン）
* データベース＆認証：Supabase（Freeプラン）

## IdentityとDataの統合（Supabaseの活用）
通常は分離すべきIdentity（認証）とData（DB）ですが、MVP開発のスピードを最大化するためにSupabaseを採用し、統合しています。
* **理由:** Supabase Authで発行されたJWTをそのままPostgreSQLのRLSに流し込めるため、バックエンドにAPIサーバーを自作する手間が省ける。

## BotとWebの分離
* **理由:** Discord BotはWebSocketで常時接続する必要がある一方、Web画面はリクエスト時のみ稼働すれば良い。特性が全く異なるため、デプロイ先を「常時稼働コンテナ（Render）」と「サーバーレス（Vercel）」に明確に分けている。

---

# 4️⃣ スケーリング戦略（将来の展望）

MVPフェーズ（P0段階）では無料枠の制約内で運用しますが、ユーザー規模が拡大した場合の戦略です。

| コンポーネント | 無料枠の制約 | スケールアップ時の対応（課金・移行） |
| :--- | :--- | :--- |
| **Supabase DB** | 500MB / 接続数制限あり | Proプラン（$25/月）へのアップグレードで容量とパフォーマンスを確保 |
| **Vercel** | Hobbyプランの帯域制限 | チーム利用が増えればProプラン（$20/月）へ |
| **Render (Bot)** | 一定時間のスリープ / RAM 512MB | Starterプラン（$7/月〜）へ移行し、スリープを回避して安定稼働させる |

※ 将来的に数十万規模のアクセスを見込む場合は、Supabaseから自前のAPI Server（Go等） + 独立したRDBへの移行も視野に入れる。