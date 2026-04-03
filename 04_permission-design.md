# 🔐 04_permission-design.md

---

# 0️⃣ 設計前提

| 項目      | 内容                               |
| ------- | -------------------------------- |
| 権限モデル   | Hybrid (RBAC + ABAC / Supabase RLSを使用) |
| マルチテナント | なし（MVP段階では単一のコミュニティ/サーバーを想定） |
| 認証方式    | OAuth (Discordログイン / Supabase Auth) |
| スコープ単位  | Global (アプリ全体)                  |
| MVP方針   | P0は「管理者(Admin)」と「一般(User)」の2ロール |

---

# 1️⃣ 用語定義

| 用語       | 意味                                |
| -------- | --------------------------------- |
| Subject  | 操作主体（Discordアカウントでログインしたユーザー） |
| Resource | 操作対象（`users`, `attendances`, `breaks` テーブルのレコード） |
| Action   | 操作内容（Select / Insert / Update）※物理削除(Delete)は原則禁止 |
| Role     | 権限グループ（`admin`, `user`） |
| Policy   | Supabase RLS (Row Level Security) の許可ルール |

---

# 2️⃣ 権限レイヤー構造（Supabase準拠）

認証・認可はデータベース（PostgreSQL）のレイヤーで直接制御し、堅牢性を担保します。

```mermaid
flowchart TD
    Client[Next.js Client / Discord Bot]
    Auth[Supabase Auth / JWT]
    DB[Supabase PostgreSQL]
    RLS[Row Level Security]
    Data[(Table Data)]

    Client -->|Request with JWT| Auth
    Auth -->|Set auth.uid()| DB
    DB --> RLS
    RLS -->|Allow / Deny| Data
```

---

# 3️⃣ RBAC設計（ロール定義）

## 3-1. グローバルロール

`users` テーブルに `role` カラム（enum または varchar）を持たせて管理します。`users.id` は Supabase Auth のユーザーID（`auth.uid()`）と一致させ、Discord ID は別カラムで保持します。

| ロール名 | レベル | 説明 |
| :--- | :--- | :--- |
| ADMIN | 80 | 管理者。全員の勤怠データの閲覧・修正が可能。 |
| USER | 10 | 一般ユーザー。**自身の勤怠データのみ**閲覧・修正が可能。 |

---

## 3-2. RBAC判定ロジック（抽象）

SupabaseのRLS内で、リクエストを送ってきたユーザーのロールを参照します。

```sql
-- PostgreSQL RLSのイメージ
(SELECT role FROM users WHERE id = auth.uid()) = 'admin'
```

---

# 4️⃣ ABAC設計（データ所有権の制御）

## 4-1. 条件モデル

誰がどのレコードを触れるか（属性ベースの制御）の定義です。

```json
{
  "subject.id": "auth.uid()",
  "resource.user_id": "attendances.user_id"
}
```

---

## 4-2. ポリシーテーブル例（Supabase RLS Policy）

| 対象テーブル | アクション | 適用ロール | 条件（USING / WITH CHECK） | Effect |
| :--- | :--- | :--- | :--- | :--- |
| `attendances` | SELECT | USER | `user_id = auth.uid()` (自分のデータのみ) | allow |
| `attendances` | SELECT | ADMIN | `true` (全データ閲覧可) | allow |
| `attendances` | INSERT/UPDATE | USER | `user_id = auth.uid()` (自分の打刻のみ) | allow |
| `attendances` | INSERT/UPDATE | ADMIN | `true` (全データ編集可) | allow |
| `breaks` | SELECT | USER | `EXISTS (SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.user_id = auth.uid())` | allow |
| `breaks` | SELECT | ADMIN | `true` (全データ閲覧可) | allow |
| `breaks` | INSERT/UPDATE | USER | `EXISTS (SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.user_id = auth.uid())` | allow |
| `breaks` | INSERT/UPDATE | ADMIN | `true` (全データ編集可) | allow |

※ `breaks` テーブルは `attendance_id` 経由で所有者を判定します。必要に応じて `user_id` を冗長に持たせても構いませんが、MVPでは `attendances` への参照で統一します。

---

# 5️⃣ ハイブリッド設計パターン

| レイヤー | 用途（今回のシステムでの役割） |
| :--- | :--- |
| RBAC | 「チーム管理画面」へのアクセス許可、全データ操作権限の付与 |
| ABAC | 「マイページ」での自分のデータ所有権の確認（他人の打刻をいじれないようにする） |

---

# 6️⃣ 代表的ルール

### 6-1. 自分のデータのみ閲覧・編集可（User）

```sql
-- Supabase RLS Policy
CREATE POLICY "Users can manage their own attendances"
ON attendances FOR ALL
USING ( auth.uid() = user_id );
```

---

### 6-2. 管理者は全データ操作可（Admin）

```sql
-- Supabase RLS Policy
CREATE POLICY "Admins can manage all attendances"
ON attendances FOR ALL
USING ( (SELECT role FROM users WHERE id = auth.uid()) = 'admin' );
```

---

# 7️⃣ データモデル連携

| ルール | 参照カラム |
| :--- | :--- |
| 所有者制御 | `attendances.user_id`, `breaks.attendance_id` |
| ロール制御 | `users.role` |

---

# 8️⃣ ログ設計（MVPではP3/将来拡張）

Supabaseは標準でAuthログとPostgreSQLの操作ログを取得するため、MVPでは独自の実装は不要ですが、将来の要件として定義しておきます。

## 監査ログ（WebhookやEdge Functionsで記録）

| フィールド | 内容 |
| :--- | :--- |
| user_id | 操作者の Supabase Auth ユーザーID（`auth.uid()`） |
| discord_user_id | 必要に応じて記録する Discord User ID |
| what | `action` (例: 'update_attendance') |
| where | `attendance_id` |
| before_time | 変更前の打刻時間 |
| after_time | 変更後の打刻時間 |

---

# 9️⃣ APIレイヤー統合（Next.js Server Actions）

Supabase ClientはJWTを自動で送信し、DB側でRLSが評価されるため、Next.js側のコードは非常にシンプルになります。

```typescript
// 権限がない場合、Supabase側で自動的にエラー（空配列またはPostgresError）が返るため、
// アプリ側での明示的な権限チェックを減らせます。
async function updateAttendance(attendanceId: string, newTime: Date) {
  const supabase = createServerComponentClient({ cookies })
  
  const { data, error } = await supabase
    .from('attendances')
    .update({ clock_in_at: newTime })
    .eq('id', attendanceId)
    // 自分がUserなら自身のレコードしかUpdateされない。Adminなら指定IDがUpdateされる。

  if (error) throw new Error("更新権限がありません、またはエラーが発生しました")
  return data
}
```

---

# 🔟 フロントエンド制御

| 制御対象 | パターン | 説明 |
| :--- | :--- | :--- |
| 管理画面リンク | 非表示 | `users.role !== 'admin'` の場合は、ナビゲーションメニューから「チーム管理」を隠す |
| 編集ボタン | 非表示/無効化 | 自身以外のレコード行には、編集アイコン（ペンマーク）を表示しない |

※ フロントエンドの制御はUX向上（エラーを出さないため）の目的であり、最終的なアクセス保護はすべてSupabase RLS（DB側）で行われます。