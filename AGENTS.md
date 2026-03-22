# リポジトリ運用ガイド

## 目的
このリポジトリでは、ローカルで動作するギター用コードダイアグラムエディタ `chordcanvas` を開発します。  
フロントエンドのみで構成し、Vite + React + TypeScript を使用します。

## 開発環境
- Node.js
- npm
- Vite
- React
- TypeScript
- ESLint
- Prettier

前提は以下です。

- Node.js のバージョンは `mise.toml` で固定する
- 開発はローカル環境で行う
- Python は使わない
- バックエンドやデータベースは使わない
- Git で管理する

## ディレクトリ構成
実装を進める際は、以下の構成を基本としてください。

- ソースコードは `src/`
- 静的アセットは `public/`
- テストは `tests/` または各モジュールの近くに `*.test.*`
- 生成物である `dist/` はソースと混在させない

## ビルド・テスト・開発コマンド
Node.js は `mise.toml` に従ってセットアップしてください。  
今後 `package.json` を追加したら、少なくとも以下のコマンドを揃えてください。

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`

必要に応じて以下も使えるようにしてください。

- `npm run typecheck`
- `npm run format`
- `npm run format:check`

## コーディングスタイルと命名規則
基本方針は以下です。

- JavaScript / TypeScript / JSON / Markdown は 2 スペースインデント
- 変数名・関数名は `camelCase`
- UI コンポーネント名は `PascalCase`
- ドキュメント類のファイル名は `kebab-case`
- 意味の分かる名前を優先し、曖昧な短縮は避ける

ESLint や Prettier を導入する場合は、設定ファイルを同じ変更内で追加してください。

## テスト方針
現時点では自動テスト基盤やカバレッジ基準は未設定です。  
機能追加時は、可能な範囲でテストも追加してください。

- テストファイル名は内容が分かるものにする
- 例: `chord-parser.test.ts`
- テスト実行方法は `package.json` に明示する

## コミット方針
以下を基本としてください。

- コミットメッセージは短く簡潔にする
- 命令形または作業内容がすぐ分かる形にする
- 1コミットにつき1つの論理変更に留める

例:

- `Add Vite React TypeScript setup`
- `Add ESLint and Prettier config`
- `Create chord diagram component`

## プルリクエスト方針
プルリクエストでは以下を含めてください。

- 変更内容の要約
- セットアップ変更の有無
- 関連 Issue への参照
- UI変更の説明はテキストで簡潔に記載する

説明は簡潔にし、差分の意図がすぐ分かるようにしてください。