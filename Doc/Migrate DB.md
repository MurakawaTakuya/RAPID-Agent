# データベースマイグレーションガイド

このプロジェクトでは [Drizzle ORM](https://orm.drizzle.team/) と [Neon](https://neon.tech/) (PostgreSQL) を使用しています。

## 前提条件

`.env.local` に以下の環境変数が設定されていることを確認してください。
- `DATABASE_URL`: Neon DB の接続文字列

## 主なコマンド

### 1. マイグレーションファイルの生成
`src/db/schema.ts` を修正したら、以下のコマンドで SQL マイグレーションファイルを生成します。

```bash
npx drizzle-kit generate
```
`drizzle` ディレクトリに新しい SQL ファイルが作成されます。

### 2. 変更の適用（開発時推奨）
スキーマの変更をデータベースに直接同期します（プロトタイピングや、既存テーブルがある場合に便利です）。

```bash
npx drizzle-kit push
```
**注意:** このコマンドはマイグレーションファイルを介さず、`schema.ts` に合わせてデータベースを直接更新します。

### 3. マイグレーションの実行（本番環境など）
生成された SQL マイグレーションファイルをデータベースに適用します。

```bash
npx dotenv -e .env.local -- npx drizzle-kit migrate
```
*メモ: 環境によっては `.env.local` が自動で読み込まれないことがあるため、`dotenv` を使って明示的に読み込んでいます。*

## トラブルシューティング

- **"Time out" や接続エラー**: Neon 側で IP アドレスが許可されているか、接続文字列が正しいか確認してください。
- **"Table already exists"**: テーブルが既に存在して `migrate` が失敗する場合は、`push` コマンドを使って同期してください。
