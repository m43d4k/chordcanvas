# chordcanvas

ローカルでコードダイアグラムを作成・編集・配置し、レイアウトを PDF 出力できるギター用コードダイアグラムエディタです。

## 現在の機能

- ルート音とコード種別からコードフォームを生成できる
- 統一されたコードダイアグラム編集 UI で押弦を直接編集できる
- コードダイアグラム編集 UI は次に追加する current chord を常に編集し、レイアウト上の既存コードは明示的に編集開始したときだけ反映できる
- 押弦マーカー内に `R`、`3`、`5`、`7`、`9` などのコードトーン degree を表示できる
- 複数の歌詞行にコードを配置できる
- よく使う押弦をコードストックに保存し、選択中の行へ再追加できる
- project JSON の書き出し / 読み込みと、レイアウト PDF 出力に対応する

## セットアップ

1. `mise install` で固定された Node.js をインストールする
2. `npm install` で依存関係を入れる
3. `npm run dev` で開発サーバーを起動する

## 利用できるスクリプト

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run format`
- `npm run format:check`
