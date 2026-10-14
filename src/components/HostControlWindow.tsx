'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CorrectnessScore, GameStatus } from '@/types/game';
import {
  GripHorizontal,
  X,
  Minus,
  Maximize2,
  Award,
  Sparkles,
  ArrowRight,
  EyeOff,
  ShieldAlert,
  Users,
} from 'lucide-react';

interface HostControlWindowProps {
  isOpen: boolean;
  onClose: () => void;
  dimensions: string[];
  voteCounts: Record<number, number>;
  correctnessSelection: Record<number, CorrectnessScore>;
  onToggleDimensionScore: (idx: number, score: CorrectnessScore) => void;
  onResetScores: () => void;
  onConfirmScores: () => void;
  roundStatus: GameStatus;
  currentRound: number;
  nextQuestionInput: string;
  setNextQuestionInput: (text: string) => void;
  onNextRound: () => void;
  totalVotedCurrentRound: number;
  totalParticipants: number;
}

export default function HostControlWindow({
  isOpen,
  onClose,
  dimensions,
  voteCounts,
  correctnessSelection,
  onToggleDimensionScore,
  onResetScores,
  onConfirmScores,
  roundStatus,
  currentRound,
  nextQuestionInput,
  setNextQuestionInput,
  onNextRound,
  totalVotedCurrentRound,
  totalParticipants,
}: HostControlWindowProps) {
  // Posizione della finestra mobile
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 40, y: 90 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 40,
    posY: 90,
  });

  // Posizionamento iniziale intelligente sul lato destro dello schermo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialX = Math.max(20, window.innerWidth - 480);
      setPosition({ x: initialX, y: 80 });
      dragStartRef.current.posX = initialX;
      dragStartRef.current.posY = 80;
    }
  }, []);

  // Gestione trascinamento con mouse o touch
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignora se si clicca sui bottoni di chiusura/riduzione
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const newX = Math.max(10, Math.min(window.innerWidth - 440, dragStartRef.current.posX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 100, dragStartRef.current.posY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignora
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
      }}
      className={`w-[440px] max-w-[94vw] rounded-2xl shadow-2xl transition-shadow ${
        isDragging ? 'shadow-indigo-500/30 ring-2 ring-indigo-500 cursor-grabbing' : 'shadow-black/80'
      } bg-zinc-900 border-2 border-indigo-500/50 backdrop-blur-xl flex flex-col overflow-hidden select-none`}
    >
      {/* Barra del Titolo Trascinabile */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="px-4 py-3 bg-gradient-to-r from-zinc-800 via-indigo-950/70 to-zinc-800 border-b border-zinc-700/80 flex items-center justify-between cursor-grab active:cursor-grabbing text-xs font-bold text-white tracking-wide"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-indigo-400" />
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Finestra Regia Host (Privata)
          </span>
        </div>

        {/* Controlli Finestra (Riduci a icona e Chiudi) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
            title={isMinimized ? 'Espandi' : 'Riduci a icona'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition"
            title="Nascondi finestra regia"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contenuto della Finestra (Espanso) */}
      {!isMinimized && (
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Avviso Anti-Spoiler Proiezione */}
          <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center gap-2 text-[11px] text-indigo-300">
            <EyeOff className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Finestra Riservata:</strong> Spostala in un angolo o sul secondo monitor per non mostrare le risposte durante la proiezione.
            </span>
          </div>

          {/* Stato Votazione Attuale */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-800/60 border border-zinc-700/60">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Voti Ricevuti:</span>
            </div>
            <span className="font-extrabold text-emerald-400">
              {totalVotedCurrentRound} su {totalParticipants} partecipanti
            </span>
          </div>

          {/* SEZIONE 1: ATTRIBUZIONE CORRETTEZZA RISPOSTE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Attribuisci Correttezza (Round {currentRound})</span>
              </div>
              <button
                type="button"
                onClick={onResetScores}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Azzera
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 mb-2.5">
              Seleziona la risposta esatta (1.0 pt) o parziale (0.5 pt):
            </p>

            <div className="space-y-1.5">
              {dimensions.map((dimName, idx) => {
                const currentScore = correctnessSelection[idx] ?? 0;
                const votesForDim = voteCounts[idx] || 0;

                return (
                  <div
                    key={`modal-score-${idx}`}
                    className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                      currentScore === 1
                        ? 'bg-emerald-950/70 border-emerald-500/80 shadow-sm'
                        : currentScore === 0.5
                        ? 'bg-amber-950/70 border-amber-500/80 shadow-sm'
                        : 'bg-zinc-800/40 border-zinc-700/50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-white block truncate text-[11px]">
                        {idx + 1}. {dimName}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {votesForDim} {votesForDim === 1 ? 'voto' : 'voti'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleDimensionScore(idx, 0)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition ${
                          currentScore === 0
                            ? 'bg-zinc-700 text-zinc-200'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        0 pt
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleDimensionScore(idx, 0.5)}
                        className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                          currentScore === 0.5
                            ? 'bg-amber-500 text-black shadow'
                            : 'bg-zinc-800 text-amber-400 hover:bg-zinc-700'
                        }`}
                      >
                        0.5
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleDimensionScore(idx, 1)}
                        className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
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

            {/* Pulsante di Conferma e Rivelazione sul Grande Schermo */}
            <button
              type="button"
              onClick={onConfirmScores}
              className="w-full mt-3 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rivela Risposta e Aggiorna Classifica</span>
            </button>
          </div>

          {/* SEZIONE 2: SCRITTURA E AVVIO PROSSIMA DOMANDA */}
          <div className="pt-3 border-t border-zinc-800">
            <span className="text-xs font-bold text-white block mb-1.5 flex items-center gap-1.5">
              <span>✍️ Scrivi Prossima Domanda (Segreta)</span>
            </span>
            <input
              type="text"
              placeholder={`Es. Domanda ${currentRound + 1}: Quale dimensione...`}
              value={nextQuestionInput}
              onChange={(e) => setNextQuestionInput(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 mb-2"
            />
            <button
              type="button"
              onClick={onNextRound}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow cursor-pointer text-xs"
            >
              <span>Avvia Round {currentRound + 1}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Vista Ridotta a Icona */}
      {isMinimized && (
        <div className="p-3 flex items-center justify-between text-xs bg-zinc-900">
          <span className="text-zinc-300 font-semibold">
            Regia ridotta a icona ({totalVotedCurrentRound}/{totalParticipants} voti)
          </span>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px]"
          >
            Espandi
          </button>
        </div>
      )}
    </div>
  );
}
