import React from 'react';

function Ranking({ pontuacao }) {
  if (!pontuacao.length) return null;
  const maxScore = pontuacao[0].score;

  return (
    <div className="card">
      <h2>📊 Ranking de Pontuação</h2>
      <p className="card-subtitle">Modelo composto: EMA + Z-Score + Markov + Co-ocorrência + Chi²</p>
      <div className="ranking-list">
        {pontuacao.map((p, idx) => (
          <div key={p.num} className="ranking-row">
            <span className="ranking-pos">{idx + 1}.</span>
            <span className="ranking-num">{String(p.num).padStart(2, '0')}</span>
            <div className="ranking-bar-container">
              <div
                className="ranking-bar"
                style={{ width: `${(p.score / maxScore * 100).toFixed(0)}%` }}
              >
                {p.score.toFixed(1)}
              </div>
            </div>
            <span className="ranking-trend">
              {p.tendencia > 0 ? '↑' : p.tendencia < 0 ? '↓' : '→'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Ranking;
