import React from 'react';

function ModoSelector({ modo, setModo, onGerar, loading }) {
  const modos = [
    { id: 'economico', nome: 'Econômico', desc: '6 jogos ultra-filtrados', icon: '💎' },
    { id: 'normal', nome: 'Normal', desc: '10 jogos balanceados', icon: '⚖️' },
    { id: 'agressivo', nome: 'Agressivo', desc: '20 jogos, máxima cobertura', icon: '🚀' },
  ];

  return (
    <div className="modo-selector">
      <h3>Escolha o modo de geração:</h3>
      <div className="modo-options">
        {modos.map(m => (
          <div
            key={m.id}
            className={`modo-card ${modo === m.id ? 'selected' : ''}`}
            onClick={() => setModo(m.id)}
          >
            <span className="modo-icon">{m.icon}</span>
            <span className="modo-nome">{m.nome}</span>
            <span className="modo-desc">{m.desc}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-gerar" onClick={onGerar} disabled={loading}>
        {loading ? (
          <><span className="spinner-small"></span> Gerando...</>
        ) : (
          <>🎲 Gerar Jogos ({modos.find(m => m.id === modo).nome})</>
        )}
      </button>
    </div>
  );
}

export default ModoSelector;
