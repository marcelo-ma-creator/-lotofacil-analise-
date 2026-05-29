import React from 'react';

function Backtest({ backtest, onRodar }) {
  return (
    <div className="card">
      <h2>🧪 Backtesting — Validação do Modelo</h2>
      <p className="card-subtitle">Simula o modelo nos últimos concursos para medir taxa de acerto real.</p>

      <button className="btn btn-primary" onClick={onRodar} disabled={!!backtest}>
        {backtest ? 'Backtest Concluído' : 'Executar Backtest'}
      </button>

      {backtest && (
        <div className="backtest-resultado">
          <div className="stats-grid">
            <div className="stat-card">
              <h4>{backtest.totalTestes}</h4>
              <p>Concursos testados</p>
            </div>
            <div className="stat-card">
              <h4>{backtest.mediaAcertos.toFixed(2)}</h4>
              <p>Média de acertos</p>
            </div>
            <div className="stat-card">
              <h4>{backtest.taxaModelo.toFixed(1)}%</h4>
              <p>Taxa de premiação</p>
            </div>
            <div className="stat-card">
              <h4>{backtest.totalPremiados}</h4>
              <p>Concursos premiados</p>
            </div>
          </div>

          <h4>Distribuição de Acertos:</h4>
          <div className="acertos-grid">
            {[15, 14, 13, 12, 11].map(n => (
              <div key={n} className="acerto-row">
                <span className="acerto-label">{n} acertos</span>
                <div className="acerto-bar-container">
                  <div
                    className="acerto-bar"
                    style={{ width: `${(backtest.acertos[n] / backtest.totalTestes * 100 * 5)}%` }}
                  ></div>
                </div>
                <span className="acerto-valor">
                  {backtest.acertos[n]}x ({(backtest.acertos[n] / backtest.totalTestes * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>

          <h4>Evolução por Concurso:</h4>
          <div className="backtest-evolucao">
            {backtest.porConcurso.slice(-30).map((item, idx) => (
              <div key={idx} className="evo-row">
                <span className="evo-label">#{item.concurso}</span>
                <div className="evo-bar-container">
                  <div
                    className={`evo-bar ${item.acerto >= 11 ? 'premiado' : ''}`}
                    style={{ width: `${(item.acerto / 15 * 100)}%` }}
                  >
                    {item.acerto}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Backtest;
