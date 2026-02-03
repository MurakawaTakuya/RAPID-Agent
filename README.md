# React/Next.js, TypeScript, Scss, GitHub, VSCodeの環境用のテンプレート

## プロジェクト作成
### React + TypeScript
```bash
npm create vite@latest my-react-app --template react
```

### Next.js + TypeScript
```bash
npx create-next-app@latest --ts
```

## ESLint
```bash
npm install --save-dev eslint-plugin-react
```
`.eslintrc.json`, `.eslintignore`を追加

## Prettier
```bash
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
```
`.prettierrc`, `.prettierignore`を追加

## Scss
```bash
npm install --save-dev sass
```
ファイル名を`.css`から`.scss`に変更

## Stylelint
```bash
npm install --save-dev stylelint stylelint-config-standard stylelint-scss stylelint-config-recess-order
```
`.stylelintrc.json`を追加
- scssファイルのlint
- cssのプロパティの順番を自動で整列

## Package.json
以下はNext.jsの場合
```json
  "scripts": {
    "dev": "npm i && next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write ."
  },

```
`dev`に`npn i`を入れておくと、package関連に変更がある時でも気にせずに使用できる

## VSCode
`.vscode/settings.json`, `.vscode/extensions.json`を追加
- セーブ時に自動でフォーマットするように設定
- おすすめの拡張機能を追加(拡張機能タブで`@recommended`で検索)
- importの並び替えと自動追加・削除

## GitHub
`.github\PULL_REQUEST_TEMPLATE.md`を追加

## Next.jsで静的エクスポートを使用する場合
`next.config.ts`に以下を追加
```ts
module.exports = {
  output: "export",
  trailingSlash: true,
}
```
```bash
npm run build
```
