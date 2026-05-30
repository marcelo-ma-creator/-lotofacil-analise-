import React from 'react';

function Header({ status }) {
  return (
    <header className="header">
      <div className="header-left">
        <h1>🎯 Lotofácil</h1>
        <span className="subtitle">Análise Avançada com Modelos Matemáticos</span>
      </div>
      <div className="header-right">
        {status && status.ultimoConcurso && (
          <div className="header-info">
            <span className="badge">Concurso #{status.ultimoConcurso.numero}</span>
            <span className="badge secondary">{status.ultimoConcurso.data}</span>
            <span className="badge secondary">{status.totalConcursos} analisados</span>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
