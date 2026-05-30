import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Volante from './components/Volante';
import Ranking from './components/Ranking';
import Jogos from './components/Jogos';
import Tendencias from './components/Tendencias';
import Ciclos from './components/Ciclos';
import Dashboard from './components/Dashboard';
import Backtest from './components/Backtest';
import ModoSelector from './components/ModoSelector';

function App() {
  const [status, setStatus] = useState(null);
  const [pontuacao, setPontuacao] = useState([]);
  const [tendencias, setTendencias] = useState([]);
  const [jogos, setJogos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [backtest, setBacktest] = useState(null);
  const [modo, setModo] = useState('normal');
  const [loading, setLoading] = useState(true);
  const [gerandoJogos, setGerandoJogos] = useState(false);
  const [tab, setTab] = useState('visao-geral');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);

      if (data.status === 'pronto') {
        const [pontRes, tendRes, cicRes] = await Promise.all([
          fetch('/api/pontuacao').then(r => r.json()),
          fetch('/api/tendencias').then(r => r.json()),
          fetch('/api/ciclos').then(r => r.json()),
        ]);
        setPontuacao(pontRes);
        setTendencias(tendRes);
        setCiclos(cicRes);
        setLoading(false);
      } else {
        setTimeout(carregarDados, 3000);
      }
    } catch (e) {
      setTimeout(carregarDados, 5000);
    }
  }

  async function gerarJogos() {
    setGerandoJogos(true);
    try {
      const res = await fetch(`/api/gerar?modo=${modo}`);
      const data = await res.json();
      setJogos(data.jogos);
    } catch (e) {
      console.error('Erro ao gerar jogos:', e);
    }
    setGerandoJogos(false);
  }

  async function rodarBacktest() {
    const res = await fetch('/api/backtest');
    const data = await res.json();
    setBacktest(data);
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <h2>Carregando dados da Lotofácil...</h2>
        {status && status.status === 'carregando' && (
          <p>{status.progresso.atual} / {status.progresso.total} concursos</p>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <Header status={status} />

      <nav className="tabs">
        <button className={tab === 'visao-geral' ? 'active' : ''} onClick={() => setTab('visao-geral')}>Visão Geral</button>
        <button className={tab === 'tendencias' ? 'active' : ''} onClick={() => setTab('tendencias')}>Tendências</button>
        <button className={tab === 'jogos' ? 'active' : ''} onClick={() => setTab('jogos')}>Gerar Jogos</button>
        <button className={tab === 'ciclos' ? 'active' : ''} onClick={() => setTab('ciclos')}>Ciclos</button>
        <button className={tab === 'backtest' ? 'active' : ''} onClick={() => setTab('backtest')}>Backtest</button>
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Dashboard</button>
      </nav>

      <main className="content">
        {tab === 'visao-geral' && (
          <div>
            <div className="card ultimo-concurso-card">
              <h2>📋 Último Concurso: #{status.ultimoConcurso.numero} — {status.ultimoConcurso.data}</h2>
              <div className="jogo-dezenas">
                {status.ultimoConcurso.dezenas.map(d => (
                  <span key={d} className="jogo-num">{String(d).padStart(2, '0')}</span>
                ))}
              </div>
            </div>
            <div className="grid-2">
              <Volante ultimoConcurso={status.ultimoConcurso.dezenas} tendencias={tendencias} />
              <Ranking pontuacao={pontuacao} />
            </div>
          </div>
        )}

        {tab === 'tendencias' && <Tendencias tendencias={tendencias} />}

        {tab === 'jogos' && (
          <div>
            <ModoSelector modo={modo} setModo={setModo} onGerar={gerarJogos} loading={gerandoJogos} />
            <Jogos jogos={jogos} />
          </div>
        )}

        {tab === 'ciclos' && <Ciclos ciclos={ciclos} />}

        {tab === 'backtest' && <Backtest backtest={backtest} onRodar={rodarBacktest} />}

        {tab === 'dashboard' && <Dashboard />}
      </main>
    </div>
  );
}

export default App;
