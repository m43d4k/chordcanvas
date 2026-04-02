# chordcanvas

[English](./README.md) | [日本語](./README-ja.md)

`chordcanvas` は、ブラウザ上でローカル動作するギター用コードダイアグラム / コード譜エディタです。コードの生成、押弦編集、歌詞行への配置、プロジェクト保存、PDF 出力までをフロントエンドだけで完結できます。

## 現在の状態

- Vite + React + TypeScript で構成されたフロントエンドアプリ
- バックエンド、データベース、Python なし
- Node.js は `mise.toml` に従って `22` 系を使用
- 標準チューニング固定の 6 弦ギター向け
- `npm run build` の出力先は `dist/`

## 現在の機能

- ルート音、コード種別、候補フォームからコードを生成できる
- `major` `minor` `5` `sus2` `sus4` `dim` `aug` `6` `m6` `7` `maj7` `m7` `m7b5` `dim7` `add9` `maj9` `m9` `7sus4` を選択できる
- コードビルダーモーダルで押弦を直接編集し、開始フレットと表示フレット数を手動調整できる
- 表示範囲の自動調整、候補コード名、ベース音、構成音、ユニーク音、各弦の音を確認できる
- 押弦マーカー内に `R` `b3` `3` `5` `b7` `7` `9` などの degree 表示を出せる
- 現在のコード、レイアウト上のコード、コードストックの表示名を個別に上書きできる
- コードストックに保存した押弦を再利用でき、同一押弦の重複登録は防止され、不要なストックは削除できる
- コードストックの `+` ボタンからストック用コード追加モーダルを開ける
- 各レイアウト行の `+` ボタンからコード追加モーダルを開き、その行へコードを追加できる
- レイアウト追加モーダル内から、コードストックの既存コードをそのまま行へ追加できる
- レイアウト上のコードブロックを選択し、編集、複製、同一行内での左右移動、削除ができる
- コードブロックは左右ドラッグで位置調整でき、後続ブロックの間隔も連動して更新される
- 複数の歌詞行を追加でき、歌詞はその場で直接編集でき、不要な行は削除できる
- 歌詞の空白を含む配置を保持したまま、レイアウトを PDF に出力できる
- ヘッダーから UI 言語を日本語 / English で切り替えられる
- project JSON の書き出し / 読み込みに対応し、読み込み時は format / version / state を検証する
- PDF は A4 縦向きの複数ページ版と、縦長 1 ページ版の 2 種類を出力できる

## セットアップ

1. `mise install`
2. `npm install`
3. `npm run dev`
4. ブラウザで表示されたローカル URL を開く

## 利用できるスクリプト

- `npm run dev`: Vite 開発サーバーを起動
- `npm run build`: TypeScript のビルド後にアプリをビルドし、成果物を `dist/` に出力
- `npm run lint`: ESLint を実行
- `npm run test`: Vitest テストを実行
- `npm run typecheck`: アプリ側 / Node 側の TypeScript 型チェックを実行
- `npm run format`: Prettier で整形
- `npm run format:check`: Prettier の整形チェックを実行

## 出力物

- project 保存ファイル名: `chordcanvas-project.json`
- 印刷向け PDF: `chordcanvas-layout.pdf`
- 表示向け縦長 PDF: `chordcanvas-layout-long.pdf`

## テストと品質管理

- テストは Vitest + Testing Library を利用
- Lint は ESLint、整形は Prettier を利用
