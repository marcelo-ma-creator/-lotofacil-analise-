import React from 'react';

function Volante({ ultimoConcurso, tendencias }) {
  const getTendClass = (num) => {
    const t = tendencias.find(d => d.num === num);
    if (!t) return '';
    if (t.tendencia > 0.05) return 'alta';
    if (t.tendencia < -0.05) return 'baixa';
    return '';
  };

  return (
    <div className="card">
      <h2>🎰 Volante — Último Concurso</h2>
      <p className="card-subtitle">
        Vermelho = sorteado | Borda verde = tendência alta | Borda vermelha = tendência baixa
      </p>
      <div className="volante-grid">
        {Array.from({ length: 25 }, (_, i) => i + 1).map(num => (
          <div
            key={num}
            className={`volante-num ${ultimoConcurso.includes(num) ? 'marcado' : ''} ${getTendClass(num)}`}
          >
            {String(num).padStart(2, '0')}
          </div>
        ))}
      </div>
      <div className="volante-legenda">
        <span><span className="dot marcado"></span> Sorteado</span>
        <span><span className="dot alta"></span> Tendência Alta</span>
        <span><span className="dot baixa"></span> Tendência Baixa</span>
      </div>
    </div>
  );
}

export default Volante;
