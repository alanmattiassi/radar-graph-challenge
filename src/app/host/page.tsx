'use client';

import React, { useState, useEffect, useMemo } from 'react';
import RadarChart from '@/components/RadarChart';
import Leaderboard from '@/components/Leaderboard';
import JoinQRCard from '@/components/JoinQRCard';
import HostControlWindow from '@/components/HostControlWindow';
import { useGameRoom } from '@/hooks/useGameRoom';
import { CorrectnessScore } from '@/types/game';
import { generateRoomCode, getSavedHostSession, saveHostSession } from '@/lib/storage';
import confetti from 'canvas-confetti';
import {
  Settings2,
  Play,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Radio,
  Users,
  ChevronRight,
  Sparkles,
  Award,
  SlidersHorizontal,
  Eye,
} from 'lucide-react';

const PRESET_TEMPLATES = [
  {
    name: 'Game Studies & Design',
    dimensions: ['Obiettivo Lusorio', 'Mezzi Lusori', 'Atteggiamento Lusorio', 'Regole Costitutive', 'Feedback'],
  },
  {
    name: 'Strategia Aziendale (5)',
    dimensions: ['Innovazione', 'Efficienza Costi', 'Customer Experience', 'Velocità Time-to-Market', 'Sostenibilità'],
  },
  {
    name: 'Triangolo di Progetto (3)',
    dimensions: ['Qualità', 'Tempo', 'Costo'],
  },
  {
    name: 'Valutazione Prodotto (4)',
    dimensions: ['Usabilità', 'Funzionalità', 'Affidabilità', 'Estetica'],
  },
];

export default function HostPage() {
  // Configurazione iniziale dimensioni
  const [numDimensions, setNumDimensions] = useState<number>(5);
  const [dimensionNames, setDimensionNames] = useState<string[]>([
    'Dimensione 1',
    'Dimensione 2',
    'Dimensione 3',
    'Dimensione 4',
    'Dimensione 5',
  ]);

  // Stato sessione stanza
  const [roomCode, setRoomCode] = useState<string>('');
  const [setupCompleted, setSetupCompleted] = useState<boolean>(false);
  const [questionInput, setQuestionInput] = useState<string>('Domanda 1: Quale dimensione è prioritaria?');
  const [nextQuestionInput, setNextQuestionInput] = useState<string>('');

  // Punteggi attribuiti dall'Host per il round (0, 0.5, 1)
  const [correctnessSelection, setCorrectnessSelection] = useState<Record<number, CorrectnessScore>>({});
  const [showVotesOnChart, setShowVotesOnChart] = useState<boolean>(true);
  const [showCorrectnessOnChart, setShowCorrectnessOnChart] = useState<boolean>(false);
  const [isControlWindowOpen, setIsControlWindowOpen] = useState<boolean>(true);

  // Hook sincronizzazione stanza con WebRTC P2P
  const {
    room,
    loading,
    p2pConnected,
    submitScores,
    nextQuestion,
    toggleCumulativeMode,
  } = useGameRoom({
    roomCode,
    isHost: true,
  });

  // Modalità cumulativa attiva di default (i voti successivi si aggiungono ai precedenti)
  const isCumulative = room?.cumulativeMode !== undefined ? room.cumulativeMode : true;

  // Ripristino sessione precedente da localStorage
  useEffect(() => {
    const saved = getSavedHostSession();
    if (saved && saved.code) {
      setRoomCode(saved.code);
      setNumDimensions(saved.numDimensions);
      setDimensionNames(saved.dimensions);
      setSetupCompleted(true);
    }
  }, []);

  // Aggiorna numero di campi dimensione
  const handleNumDimensionsChange = (n: number) => {
    const count = Math.max(3, Math.min(12, n));
    setNumDimensions(count);
    setDimensionNames((prev) => {
      const updated = [...prev];
      while (updated.length < count) {
        updated.push(`Dimensione ${updated.length + 1}`);
      }
      return updated.slice(0, count);
    });
  };

  const applyPreset = (preset: { name: string; dimensions: string[] }) => {
    setNumDimensions(preset.dimensions.length);
    setDimensionNames([...preset.dimensions]);
  };

  // Creazione stanza
  const handleCreateRoom = async () => {
    const code = generateRoomCode();
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          numDimensions,
          dimensions: dimensionNames,
          firstQuestion: questionInput,
        }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        setRoomCode(code);
        setSetupCompleted(true);
        saveHostSession(data.room);
      }
    } catch (e) {
      console.error('Errore creazione stanza:', e);
    }
  };

  const isRoundScored = room?.status === 'scored';

  // Calcolo conteggio voti per ciascuna dimensione
  // REGOLA TASSATIVA: I voti della domanda corrente rimangono completamente NASCOSTI sulle dimensioni finché non viene svelata la risposta corretta!
  const visibleVoteCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    if (!room) return counts;

    // Se la modalità cumulativa è attiva, includi i voti dei round precedenti già conclusi
    if (isCumulative && room.roundHistory && room.roundHistory.length > 0) {
      room.roundHistory.forEach((pastRound) => {
        if (pastRound.votes) {
          Object.values(pastRound.votes).forEach((v) => {
            counts[v.dimensionIndex] = (counts[v.dimensionIndex] || 0) + 1;
          });
        }
      });
    }

    // Aggiungi i voti della domanda corrente SOLTANTO se la risposta corretta è già stata svelata (status === 'scored')
    if (isRoundScored && room.round && room.round.votes) {
      Object.values(room.round.votes).forEach((v) => {
        counts[v.dimensionIndex] = (counts[v.dimensionIndex] || 0) + 1;
      });
    }

    return counts;
  }, [room, isCumulative, isRoundScored]);

  const visibleTotalVotes = useMemo(() => {
    return Object.values(visibleVoteCounts).reduce((sum, count) => sum + count, 0);
  }, [visibleVoteCounts]);

  const currentRoundVotesCount = useMemo(() => {
    if (!room || !room.round || !room.round.votes) return 0;
    return Object.keys(room.round.votes).length;
  }, [room]);

  const participantsList = useMemo(() => {
    if (!room || !room.participants) return [];
    return Object.values(room.participants);
  }, [room]);

  // Seleziona punteggio per una dimensione (0 -> 0.5 -> 1.0 -> 0)
  const toggleDimensionScore = (dimIndex: number, score: CorrectnessScore) => {
    setCorrectnessSelection((prev) => ({
      ...prev,
      [dimIndex]: score,
    }));
  };

  // Conferma attribuzione correttezza e mostra sul grafico radar
  const handleConfirmScores = async () => {
    const success = await submitScores(correctnessSelection);
    if (success) {
      setShowCorrectnessOnChart(true);
      setShowVotesOnChart(true);
      // Fuochi d'artificio celebrativi per i risultati
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  // Avanzamento alla domanda successiva
  const handleNextRound = async () => {
    const nextText = nextQuestionInput.trim() || `Domanda ${(room?.currentRound || 1) + 1}`;
    const success = await nextQuestion(nextText);
    if (success) {
      setNextQuestionInput('');
      setCorrectnessSelection({});
      setShowCorrectnessOnChart(false);
      setShowVotesOnChart(true);
    }
  };

  // Riavvio completo / nuova sessione
  const handleResetSession = () => {
    if (confirm('Sei sicuro di voler creare una nuova sessione? La stanza attuale verrà chiusa.')) {
      setSetupCompleted(false);
      setRoomCode('');
      setCorrectnessSelection({});
      setShowCorrectnessOnChart(false);
      localStorage.removeItem('radar_game_host_session');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Bar Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white shadow-lg">
            RG
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              Radar Graph Challenge
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Host Console
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Gioco interattivo sul riempimento dei grafi ad area poligonali
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge Stato Connessione P2P Realtime */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              p2pConnected
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${p2pConnected ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
            <span>{p2pConnected ? 'Rete P2P Attiva' : 'Inizializzazione Rete...'}</span>
          </div>

          {setupCompleted && (
            <>
              <button
                type="button"
                onClick={() => setIsControlWindowOpen(!isControlWindowOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-md ${
                  isControlWindowOpen
                    ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-500/30'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700'
                }`}
                title="Apri o nascondi la finestra pop-up di regia per le risposte"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isControlWindowOpen ? 'Nascondi Regia' : '🎛️ Apri Regia Riservata'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetSession}
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-xl transition cursor-pointer"
                title="Nuova Partita"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Contenuto Principale */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {!setupCompleted ? (
          /* =========================================================================
             FASE 1: SETUP INIZIALE DIMENSIONI & FORMA POLIGONALE
             ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-6">
            {/* Colonna Sinistra: Form di configurazione */}
            <div className="lg:col-span-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-2 text-indigo-400">
                <Settings2 className="w-5 h-5" />
                <h2 className="text-lg font-bold text-white">Configura Dimensioni e Grafico</h2>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                Scegli il numero di dimensioni e assegna un nome a ciascuna. La forma poligonale del radar graph si adatterà automaticamente (3 = triangolo, 4 = quadrato, 5 = pentagono, etc.).
              </p>

              {/* Preset rapidi */}
              <div className="mb-6">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                  Template Predefiniti:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TEMPLATES.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-medium text-zinc-200 transition cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selettore Numero Dimensioni */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-zinc-200">
                    Numero di Dimensioni: <span className="text-indigo-400 font-bold">{numDimensions}</span>
                  </label>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300 font-semibold">
                    {numDimensions === 3 && 'Forma Triangolare'}
                    {numDimensions === 4 && 'Forma Quadrata / Romboidale'}
                    {numDimensions === 5 && 'Forma Pentagonale'}
                    {numDimensions === 6 && 'Forma Esagonale'}
                    {numDimensions === 7 && 'Forma Ettagonale'}
                    {numDimensions === 8 && 'Forma Ottagonale'}
                    {numDimensions > 8 && `Poligono a ${numDimensions} lati`}
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={numDimensions}
                  onChange={(e) => handleNumDimensionsChange(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
                <div className="flex justify-between text-[11px] text-zinc-500 mt-1">
                  <span>3 (Minimo)</span>
                  <span>5 (Consigliato)</span>
                  <span>10 (Massimo)</span>
                </div>
              </div>

              {/* Nomi delle Dimensioni agli estremi degli assi */}
              <div className="space-y-3 mb-6">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                  Nomi delle Dimensioni (Vertici dell&apos;Asse):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {dimensionNames.map((name, idx) => (
                    <div key={`dim-input-${idx}`} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-400 font-mono text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          const updated = [...dimensionNames];
                          updated[idx] = e.target.value;
                          setDimensionNames(updated);
                        }}
                        placeholder={`Dimensione ${idx + 1}`}
                        className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Testo Prima Domanda */}
              <div className="mb-6">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Testo Prima Domanda:
                </label>
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder="Es. Quale dimensione influenza maggiormente l'obiettivo lusorio?"
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Pulsante Avvia Stanza */}
              <button
                type="button"
                onClick={handleCreateRoom}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Genera Radar Graph e Crea Stanza Gioco</span>
              </button>
            </div>

            {/* Colonna Destra: Anteprima Live del Radar Graph Poligonale */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
              <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2">
                Anteprima Dinamica Forma Grafico
              </span>
              <RadarChart
                numDimensions={numDimensions}
                dimensions={dimensionNames}
                showVotes={false}
                showCorrectness={false}
                size={480}
              />
              <p className="text-xs text-zinc-500 text-center mt-3 max-w-sm">
                La forma è un poligono regolare a {numDimensions} vertici con griglie concentriche proporzionali.
              </p>
            </div>
          </div>
        ) : (
          /* =========================================================================
             FASE 2: CONSOLE DI GIOCO ATTIVA (LOBBY / VOTING / SCORING / NEXT ROUND)
             ========================================================================= */
          <div className="space-y-6">
            {/* Header del Round Attivo */}
            <div className="bg-gradient-to-r from-zinc-900 to-indigo-950/40 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-black text-sm tracking-wide">
                  ROUND {room?.currentRound || 1}
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-extrabold text-white">
                    {room?.currentQuestion || questionInput}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                    <span>
                      Stanza: <strong className="text-indigo-400 font-mono">{room?.code}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      {participantsList.length} partecipanti collegati
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">
                      {currentRoundVotesCount} su {participantsList.length} votanti
                    </span>
                    {isCumulative && (room?.roundHistory?.length || 0) > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-400 font-semibold">
                          Cumulativo: {visibleTotalVotes} voti su {(room?.roundHistory?.length || 0) + 1} round
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Badge Stato del Round */}
              <div className="flex items-center gap-2">
                {room?.status === 'voting' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Votazioni Aperte
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Punteggi Assegnati
                  </span>
                )}
              </div>
            </div>

            {/* Layout a 3 Colonne: QR Code / Radar Graph / Classifica */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Colonna Sinistra (3/12): QR Code & Onboarding partecipanti */}
              <div className="lg:col-span-3 space-y-4">
                <JoinQRCard roomCode={room?.code || roomCode} />

                {/* Elenco Partecipanti con Codici Alfanumerici */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Giocatori nella Stanza
                    </h4>
                    <span className="text-xs font-mono text-zinc-400">{participantsList.length}</span>
                  </div>

                  {participantsList.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-3 text-center">
                      In attesa che le persone scansionino il QR Code...
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {participantsList.map((p) => {
                        const hasVoted = Boolean(room?.round?.votes?.[p.id]);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-800/50 text-xs"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-zinc-200 truncate">{p.nickname}</span>
                              <span className="text-[10px] font-mono text-zinc-500">({p.playerCode})</span>
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                hasVoted
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-zinc-700/60 text-zinc-400'
                              }`}
                            >
                              {hasVoted ? 'Ha Votato' : 'In attesa'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Colonna Centrale (6/12): GRAFICO RADAR POLIGONALE E CONTROLLI PUNTEGGIO */}
              <div className="lg:col-span-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col items-center">
                {/* Interruttore 1-Click per Riempimento Cumulativo (attivo di default) */}
                <div className="w-full flex items-center justify-between mb-4 bg-zinc-800/60 border border-zinc-700/60 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Riempimento Grafico:
                    </span>
                    <span className="text-[11px] text-zinc-400 hidden sm:inline">
                      {isCumulative
                        ? 'I voti della risposta successiva si aggiungono a quella precedente'
                        : 'Mostra solo i voti della domanda corrente'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCumulativeMode(!isCumulative)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      isCumulative
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Clicca per attivare o disattivare il riempimento cumulativo"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isCumulative ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-600'
                      }`}
                    />
                    <span>{isCumulative ? 'Cumulativo: ON' : 'Cumulativo: OFF'}</span>
                  </button>
                </div>

                {/* Visualizzazione Radar Graph */}
                <RadarChart
                  numDimensions={room?.numDimensions || numDimensions}
                  dimensions={room?.dimensions || dimensionNames}
                  votes={visibleVoteCounts}
                  totalVoters={visibleTotalVotes}
                  correctness={room?.round?.correctness || correctnessSelection}
                  showVotes={isRoundScored || (isCumulative && (room?.roundHistory?.length || 0) > 0)}
                  showCorrectness={isRoundScored}
                  size={520}
                />

                {/* Scheda di Presentazione Proiettata (Nessun dato riservato visibile al pubblico) */}
                <div className="w-full mt-6 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <SlidersHorizontal className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {room?.status === 'voting'
                          ? 'Votazioni aperte per la domanda corrente'
                          : 'Risultati e risposte corrette rivelati sul grafico'}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {room?.status === 'voting'
                          ? `${currentRoundVotesCount} su ${participantsList.length} partecipanti hanno votato`
                          : 'Usa la finestra regia per preparare la domanda successiva'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsControlWindowOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>
                      {room?.status === 'voting'
                        ? 'Apri Regia Riservata (Assegna Correttezza)'
                        : 'Apri Regia Riservata (Prossima Domanda)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Colonna Destra (3/12): CLASSIFICA PUNTI DEI PARTECIPANTI */}
              <div className="lg:col-span-3">
                <Leaderboard
                  participants={participantsList}
                  currentRoundVotes={room?.round?.votes}
                  isVotingActive={room?.status === 'voting'}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Finestra Pop-up Mobile e Trascinabile per la Regia Riservata dell'Host */}
      {setupCompleted && (
        <HostControlWindow
          isOpen={isControlWindowOpen}
          onClose={() => setIsControlWindowOpen(false)}
          dimensions={room?.dimensions || dimensionNames}
          voteCounts={visibleVoteCounts}
          correctnessSelection={correctnessSelection}
          onToggleDimensionScore={toggleDimensionScore}
          onResetScores={() => setCorrectnessSelection({})}
          onConfirmScores={handleConfirmScores}
          roundStatus={room?.status || 'voting'}
          currentRound={room?.currentRound || 1}
          nextQuestionInput={nextQuestionInput}
          setNextQuestionInput={setNextQuestionInput}
          onNextRound={handleNextRound}
          totalVotedCurrentRound={currentRoundVotesCount}
          totalParticipants={participantsList.length}
        />
      )}

      {/* Pillola Galleggiante in basso a destra per riaprire rapidamente la regia se chiusa */}
      {setupCompleted && !isControlWindowOpen && (
        <button
          type="button"
          onClick={() => setIsControlWindowOpen(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-2xl flex items-center gap-2 text-xs border border-indigo-400/40 cursor-pointer shadow-indigo-600/30 transition-all hover:scale-105"
        >
          <SlidersHorizontal className="w-4 h-4 text-white" />
          <span>Apri Regia Riservata</span>
        </button>
      )}
    </div>
  );
}
