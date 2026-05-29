import React from 'react';

function Jogos({ jogos }) {
  if (!jogos || jogos.length === 0) {
    return (
      <div className="card">
        <h2>🎲 Jogos Gerados</h2>
        <p className="empty-state">Clique em "Gerar Jogos" para criar suas apostas otimizadas.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>🎲 Jogos Gerados ({jogos.length})</h2>
      <div className="jogos-grid">
        {jogos.map((jogo, idx) => (
          <div key={idx} className="jogo-card">
            <div className="jogo-header">
              <h3>Jogo {jogo.numero}</h3>
              <span className="jogo-estrategia">{jogo.estrategia}</span>
            </div>
            <div className="jogo-dezenas">
              {jogo.dezenas.map(d => (
                <span key={d} className="jogo-num">{String(d).padStart(2, '0')}</span>
              ))}
            </div>
            <div className="jogo-stats">
              <span>Soma: {jogo.soma}</span>
              <span>Par/Ímpar: {jogo.pares}/{jogo.impares}</span>
              <span>Seq: {jogo.sequencias}</span>
              <span>Rep: {jogo.repeticoes}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Jogos;
