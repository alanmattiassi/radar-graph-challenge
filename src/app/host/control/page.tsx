'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameRoom } from '@/hooks/useGameRoom';
import { getSavedHostSession } from '@/lib/storage';
import { CorrectnessScore } from '@/types/game';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  ArrowRight,
  EyeOff,
  Users,
  Award,
  Layers,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

function ControlContent() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code') || '';

  const [activeCode, setActiveCode] = useState<string>('');

  useEffect(() => {
    if (codeParam) {
      setActiveCode(codeParam.toUpperCase());
    } else {
      const saved = getSavedHostSession();
      if (saved?.code) {
        setActiveCode(saved.code.toUpperCase());
      }
    }
  }, [codeParam]);

  const {
    room,
    loading,
    error,
    p2pConnected,
    submitScores,
    nextQuestion,
    toggleCumulativeMode,
  } = useGameRoom({
    roomCode: activeCode,
    isHost: true,
  });

  const [correctnessSelection, setCorrectnessSelection] = useState<Record<number, CorrectnessScore>>({});
  const [nextQuestionInput, setNextQuestionInput] = useState<string>('');
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);

  // Sincronizza selezione correttezza dallo stato stanza se già scored
  useEffect(() => {
    if (room?.round?.correctness && Object.keys(room.round.correctness).length > 0) {
      setCorrectnessSelection(room.round.correctness);
    } else if (room?.status === 'voting') {
      setCorrectnessSelection({});
    }
  }, [room?.currentRound, room?.status]);

  const participantsList = useMemo(() => {
    if (!room?.participants) return [];
    return Object.values(room.participants);
  }, [room]);

  const currentRoundVotesCount = useMemo(() => {
    if (!room?.round?.votes) return 0;
    return Object.keys(room.round.votes).length;
  }, [room]);

  const isRoundScored = room?.status === 'scored';

  // Toggle punteggio per una dimensione
  const toggleDimensionScore = (dimIdx: number, score: CorrectnessScore) => {
    setCorrectnessSelection((prev) => ({
      ...prev,
      [dimIdx]: score,
    }));
  };

  // Conferma attribuzione correttezza e rivelazione sul grande schermo
  const handleConfirmScores = async () => {
    const success = await submitScores(correctnessSelection);
    if (success) {
      setLastActionFeedback('✅ Risposte corrette svelate sul grande schermo!');
      setTimeout(() => setLastActionFeedback(null), 3500);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }
  };

  // Avanzamento alla domanda successiva
  const handleNextRound = async () => {
    const nextRoundNum = (room?.currentRound || 1) + 1;
    const nextText = nextQuestionInput.trim() || `Domanda ${nextRoundNum}`;
    const success = await nextQuestion(nextText);
    if (success) {
      setNextQuestionInput('');
      setCorrectnessSelection({});
      setLastActionFeedback(`🚀 Round ${nextRoundNum} avviato con successo!`);
      setTimeout(() => setLastActionFeedback(null), 3500);
    }
  };

  if (!activeCode && !loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-lg font-bold">Nessuna stanza Host attiva trovata</h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm">
          Apri prima la schermata principale di proiezione per creare o ripristinare la sessione di gioco.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none">
      {/* Header Finestra Regia */}
      <header className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white text-xs shadow">
            RG
          </div>
          <div>
            <h1 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Finestra Regia Separata</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono">
              Stanza: <strong className="text-indigo-400">{activeCode}</strong> • Round {room?.currentRound || 1}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge Stato Connessione Proiettore */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-700/50 text-[10px] text-indigo-300 font-semibold">
            <Monitor className="w-3 h-3 text-indigo-400" />
            <span>Schermo Collegato</span>
          </div>
        </div>
      </header>

      {/* Banner Notifica Feedback Azione */}
      {lastActionFeedback && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center shadow-lg transition-all animate-fadeIn">
          {lastActionFeedback}
        </div>
      )}

      {/* Contenuto Principale Regia */}
      <main className="p-4 space-y-4 max-w-xl mx-auto w-full flex-1 overflow-y-auto text-xs pb-12">
        {/* Box informativo monitor */}
        <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-2.5 text-[11px] text-indigo-300">
          <EyeOff className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            <strong>Finestra Privata e Separabile:</strong> Puoi trascinare questa finestra sul monitor del tuo portatile mentre mantieni la visualizzazione del gioco a tutto schermo sul proiettore.
          </span>
        </div>

        {/* Barra di Stato Voto & Partecipanti */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-[11px] text-zinc-300 font-medium">Voti Ricevuti:</span>
            </div>
            <span className="font-extrabold text-emerald-400 text-sm">
              {currentRoundVotesCount}/{participantsList.length}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-[11px] text-zinc-300 font-medium">Cumulativo:</span>
            </div>
            <button
              type="button"
              onClick={() => toggleCumulativeMode(!(room?.cumulativeMode ?? true))}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                room?.cumulativeMode ?? true
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {room?.cumulativeMode ?? true ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Domanda Corrente */}
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-1">
            Domanda Attuale (Round {room?.currentRound || 1}):
          </span>
          <p className="font-semibold text-white text-sm">
            {room?.round?.questionText || room?.currentQuestion || 'Nessuna domanda impostata'}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                room?.status === 'voting'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {room?.status === 'voting' ? '⏳ Votazione in corso' : '✓ Risposte Rivelate'}
            </span>
          </div>
        </div>

        {/* SEZIONE 1: ATTRIBUZIONE PUNTEGGI & CORRETTEZZA */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-white text-sm">Attribuzione Risposta Corretta</h2>
            </div>
            <button
              type="button"
              onClick={() => setCorrectnessSelection({})}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Azzera</span>
            </button>
          </div>

          <p className="text-[11px] text-zinc-400">
            Assegna 1.0 pt alla dimensione corretta e opzionalmente 0.5 pt a risposte parziali:
          </p>

          <div className="space-y-2">
            {(room?.dimensions || []).map((dimName, idx) => {
              const currentScore = correctnessSelection[idx] ?? 0;
              const votesForDim = isRoundScored ? (room?.round?.votes ? Object.values(room.round.votes).filter((v) => v.dimensionIndex === idx).length : 0) : 0;

              return (
                <div
                  key={`ctrl-dim-${idx}`}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    currentScore === 1
                      ? 'bg-emerald-950/70 border-emerald-500 shadow-sm'
                      : currentScore === 0.5
                      ? 'bg-amber-950/70 border-amber-500 shadow-sm'
                      : 'bg-zinc-800/40 border-zinc-700/50'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-white block truncate text-xs">
                      {idx + 1}. {dimName}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {isRoundScored ? (
                        <span className="text-indigo-300 font-semibold">{votesForDim} {votesForDim === 1 ? 'voto' : 'voti'}</span>
                      ) : (
                        <span className="text-zinc-500 italic">🔒 Nascosto fino allo svelamento</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleDimensionScore(idx, 0)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition ${
                        currentScore === 0
                          ? 'bg-zinc-700 text-zinc-200'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      0 pt
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDimensionScore(idx, 0.5)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                        currentScore === 0.5
                          ? 'bg-amber-500 text-black shadow'
                          : 'bg-zinc-800 text-amber-400 hover:bg-zinc-700'
                      }`}
                    >
                      0.5 pt
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDimensionScore(idx, 1)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                        currentScore === 1
                          ? 'bg-emerald-500 text-black shadow'
                          : 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700'
                      }`}
                    >
                      1.0 pt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pulsante Rivelazione Risposta sul Grande Schermo */}
          <button
            type="button"
            onClick={handleConfirmScores}
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer text-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Rivela Risposta e Aggiorna Classifica sul Proiettore</span>
          </button>
        </div>

        {/* SEZIONE 2: SCRITTURA E AVVIO PROSSIMA DOMANDA */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <span className="text-base">✍️</span>
            <h2 className="font-bold text-white text-sm">
              Scrivi e Avvia Prossima Domanda (Round {(room?.currentRound || 1) + 1})
            </h2>
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">
              Testo della prossima domanda (rimane segreto fino all'avvio):
            </label>
            <input
              type="text"
              placeholder={`Es. Domanda ${(room?.currentRound || 1) + 1}: Quale dimensione presenta...`}
              value={nextQuestionInput}
              onChange={(e) => setNextQuestionInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={handleNextRound}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer text-xs"
          >
            <span>Avvia Round {(room?.currentRound || 1) + 1} Ora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}

export default function HostControlPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center text-xs">
          Caricamento regia...
        </div>
      }
    >
      <ControlContent />
    </Suspense>
  );
}
