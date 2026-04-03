# 🖥️ 03_screen-flow.md

---

# 0️⃣ 設計前提

| 項目     | 内容                            |
| ------ | ----------------------------- |
| 対象ユーザー | Discordで打刻を行う一般ユーザー / 勤怠管理者          |
| デバイス   | Desktop / Mobile (Responsive対応) |
| 認証要否   | 全面認証制（未ログイン時はログイン画面へリダイレクト） |
| 権限制御   | RBAC（Admin：全員のデータ閲覧・編集 / User：自身のデータのみ） |
| MVP範囲  | P0（ログイン、ダッシュボード一覧、編集機能）のみ                        |

---

# 1️⃣ 画面一覧（Screen Inventory）

| ID   | 画面名     | 役割     | 認証  | 優先度 |
| ---- | ------- | ------ | --- | --- |
| S-01 | ログイン    | Discord OAuthでの認証 | 不要  | 🔴 P0  |
| S-02 | ダッシュボード | 自分の勤怠一覧・ステータス確認 | 必須  | 🔴 P0  |
| S-03 | 編集モーダル | 打刻漏れ・時間の修正 | 必須  | 🔴 P0  |
| S-04 | チーム管理   | （管理者用）メンバーの勤怠一覧 | 管理者 | 🟡 P1  |
| S-05 | 設定画面    | 表示設定・エクスポート等 | 必須  | 🟢 P2  |

---

# 2️⃣ 全体遷移図（高レベル）

```mermaid
flowchart TD
    LOGIN[Login Screen]
    DASH[Dashboard / My Page]
    EDIT_MODAL[Edit Modal]
    ADMIN[Team Admin Panel]
    SETTINGS[Settings]

    LOGIN -->|Discord OAuth| DASH
    DASH --> EDIT_MODAL
    DASH -->|Admin Role Only| ADMIN
    ADMIN --> EDIT_MODAL
    DASH --> SETTINGS
```

---

# 3️⃣ 認証フロー

```mermaid
flowchart LR
    Access[App Access]
    AuthCheck{Session Exists?}
    Login[Login Page]
    OAuth[Supabase Discord OAuth]
    App[Dashboard]

    Access --> AuthCheck
    AuthCheck -- No --> Login
    AuthCheck -- Yes --> App
    Login --> OAuth
    OAuth -->|Callback| App
```

---

# 4️⃣ CRUD標準遷移テンプレ（モーダル運用）

管理画面では別ページに遷移せず、一覧画面（Dashboard）から直接モーダルを開いて編集するモダンなUXを採用。

```mermaid
flowchart LR
    List[Dashboard List] -->|Click Record| EditModal[Open Edit Modal]
    List -->|Click Add| CreateModal[Open Create Modal]
    EditModal -->|Save/Update| List
    CreateModal -->|Save/Insert| List
```

---

# 5️⃣ 状態別分岐（State-based Flow）

Discordでの打刻状況に応じた、ダッシュボード上の現在ステータス表示の分岐。

```mermaid
flowchart TD
    CheckStatus{Current Status}
    CheckStatus -->|No Record| State1[未出勤]
    CheckStatus -->|working| State2[勤務中]
    CheckStatus -->|on_break| State3[休憩中]
    CheckStatus -->|finished| State4[退勤済]
```

---

# 6️⃣ 権限別分岐（RBAC）

```mermaid
flowchart TD
    Dashboard --> RoleCheck{User Role}
    RoleCheck -->|User| UserView[自分の勤怠データのみ取得・表示]
    RoleCheck -->|Admin| AdminView[Team Adminリンク表示 / 全員分取得]
    UserView --> CheckRLS[Supabase RLS: 自身のレコードのみUPDATE許可]
    AdminView --> CheckRLSAdmin[Supabase RLS: 全レコードのUPDATE許可]
```

---

# 7️⃣ モーダル・非同期操作

```mermaid
flowchart LR
    Dashboard --> OpenModal[Edit Record]
    OpenModal --> SubmitAction[Save Changes]
    SubmitAction --> API[Supabase API / mutate]
    API -->|Success| ToastSuccess[Show Success Toast]
    ToastSuccess --> CloseModal[Close Modal & Refresh List]
    API -->|Error| ToastError[Show Error Toast]
```

---

# 8️⃣ エラーフロー

```mermaid
flowchart TD
    Action --> SupabaseAPI
    SupabaseAPI -->|Success| UpdateUI
    SupabaseAPI -->|RLS Error| Toast[Error: 権限がありません]
    SupabaseAPI -->|Validation| FormError[Error: 時間の整合性が合いません]
    SupabaseAPI -->|Token Expired| RedirectLogin[Redirect to Login]
```

---

# 9️⃣ 空状態 / 初回体験

```mermaid
flowchart TD
    Dashboard --> HasData{Has Attendance Data?}
    HasData -->|No| EmptyState[Empty State: 'Discordで /kintai 開始 を打って出勤しましょう！']
    HasData -->|Yes| NormalList[Render Table Data]
```

---

# 🔟 モバイル考慮

| 項目      | Desktop | Mobile     |
| ------- | ------- | ---------- |
| ナビゲーション | Sidebar | Bottom Navigation / Hamburger |
| 一覧表示    | Table（列多数） | Card View（縦積みスクロール） |
| 編集画面    | Modal | Full Screen Dialog / Bottom Sheet |

---

# 12️⃣ URL設計テンプレ

Next.js (App Router) を想定したルーティング。

```text
/login                # ログイン画面
/                     # ダッシュボード（自分の勤怠一覧）
/admin                # チーム管理画面（管理者のみアクセス可）
/settings             # ユーザー設定・エクスポート
```