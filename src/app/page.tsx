export default function Home() {
  return (
    <main style={{ fontFamily: "Arial, sans-serif", padding: "2rem" }}>
      <h1>pcUpgradeAPP</h1>
      <p>Fase 0: repo, health y prueba de scraping.</p>
      <ul>
        <li>
          <a href="/api/health">/api/health</a>
        </li>
        <li>
          <a href="/api/scrape-test?q=rtx%203060">/api/scrape-test?q=rtx 3060</a>
        </li>
      </ul>
    </main>
  );
}
