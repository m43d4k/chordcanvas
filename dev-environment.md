# 開発環境

## 採用構成
- Node.js
- npm
- Vite
- React
- TypeScript
- ESLint
- Prettier

## 前提
- Node.js のバージョンは mise で固定済み
- 開発はローカル環境で行う
- Codex を使ってセットアップと実装を進める
- Python は使わない
- バックエンドやデータベースは使わない
- Git で管理する

## 用途ごとの役割
- Node.js: 開発基盤
- npm: パッケージ管理とスクリプト実行
- Vite: 開発サーバーとビルド
- React: UI実装
- TypeScript: 型付き実装
- ESLint: コード品質チェック
- Prettier: コード整形

## 想定するリポジトリ構成
.
├─ src/
├─ public/
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ vite.config.ts
├─ eslint.config.js
├─ .prettierrc
├─ .prettierignore
├─ .gitignore
├─ README.md
└─ README-ja.md
