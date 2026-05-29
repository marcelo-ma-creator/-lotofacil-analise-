import React, { useState, useEffect } from 'react';

function Dashboard() {
  const [calibracao, setCalibracao] = useState(null);
  const [loading, setLoading] = useState(false);

  async function carregarCalibracao() {
    setLoading(true);
    try {
      const res = await fetch('/api/calibrar');
      const data = await res.json();
      setCalibracao(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  return (
    <div className="card">
      <h2>📈 Dashboard de Performance</h2>

      <div className="dashboard-section">
        <h3>Auto-Calibração de Pesos</h3>
        <p className="card-subtitle">Testa diferentes combinações de pesos e encontra a melhor configuração.</p>
        <button className="btn btn-primary" onClick={carregarCalibracao} disabled={loading}>
          {loading ? 'Calibrando...' : 'Executar Calibração'}
        </button>

        {calibracao && (
          <div className="calibracao-resultado">
            <div className="calibracao-melhor">
              <h4>★ Melhor Configuração: {calibracao.melhor.nome}</h4>
              <p>Média de acertos: <strong>{calibracao.mediaGeral.toFixed(2)}</strong></p>
              <div className="pesos-grid">
                {['FreqHist', 'Tendência', 'Z-Score', 'Co-ocorr', 'Markov', 'Atraso', 'Chi²'].map((nome, i) => (
                  <div key={nome} className="peso-item">
                    <span className="peso-nome">{nome}</span>
                    <div className="peso-bar" style={{ width: `${calibracao.melhor.pesos[i] * 100 * 3}%` }}></div>
                    <span className="peso-valor">{(calibracao.melhor.pesos[i] * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <h4>Todas as configurações testadas:</h4>
            <div className="calibracao-lista">
              {calibracao.resultados.sort((a, b) => b.media - a.media).map((r, idx) => (
                <div key={idx} className={`calibracao-row ${r.nome === calibracao.melhor.nome ? 'melhor' : ''}`}>
                  <span className="calibracao-nome">{r.nome}</span>
                  <div className="calibracao-bar-container">
                    <div className="calibracao-bar" style={{ width: `${(r.media / 15 * 100).toFixed(0)}%` }}></div>
                  </div>
                  <span className="calibracao-media">{r.media.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
