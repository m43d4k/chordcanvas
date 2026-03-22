const highlights = [
  {
    title: 'Local-first editing',
    description:
      'ブラウザだけでコードダイアグラムを作成・編集できる土台を用意しています。',
  },
  {
    title: 'Type-safe foundation',
    description:
      'React と TypeScript を使って、今後の機能追加を安全に進められます。',
  },
  {
    title: 'Quality checks',
    description: 'ESLint、Prettier、Vitest を初期状態から組み込みました。',
  },
]

function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Guitar chord diagram editor</p>
        <h1>ChordCanvas</h1>
        <p className="lead">
          ローカルで動作するコードダイアグラムエディタの開発環境をセットアップしました。
          ここから描画機能や保存機能を段階的に追加できます。
        </p>
      </section>

      <section className="card-grid" aria-label="Project highlights">
        {highlights.map((item) => (
          <article className="feature-card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
