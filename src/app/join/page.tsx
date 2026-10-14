'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  generatePlayerCode,
  getSavedPlayerSession,
  savePlayerSession,
  clearPlayerSession,
} from '@/lib/storage';
import { PlayerSession } from '@/types/game';
import { useGameRoom } from '@/hooks/useGameRoom';
import { DIMENSION_PALETTES } from '@/lib/polygonMath';
import Leaderboard from '@/components/Leaderboard';
import RadarChart from '@/components/RadarChart';
import confetti from 'canvas-confetti';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  Trophy,
  Wifi,
  WifiOff,
  LogOut,
  Sparkles,
  HelpCircle,
  Eye,
} from 'lucide-react';

function PlayerContent() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get('room') || '';

  const [playerSession, setPlayerSession] = useState<PlayerSession | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState<string>(roomParam.toUpperCase());
  const [nicknameInput, setNicknameInput] = useState<string>('');
  const [assignedCode, setAssignedCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Selezione del voto corrente da parte del giocatore
  const [selectedDimension, setSelectedDimension] = useState<number | null>(null);
  const [hasVotedCurrentRound, setHasVotedCurrentRound] = useState<boolean>(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState<boolean>(false);
  const [showRadarOnMobile, setShowRadarOnMobile] = useState<boolean>(false);

  // 1. Controllo ripristino sessione locale (resilienza caduta connessione)
  useEffect(() => {
    const saved = getSavedPlayerSession();
    if (saved) {
      // Se c'è un roomParam diverso, o se la stanza coincide
      if (!roomParam || saved.roomCode.toUpperCase() === roomParam.toUpperCase()) {
        setPlayerSession(saved);
        setRoomCodeInput(saved.roomCode);
        return;
      }
    }

    // Altrimenti genera nuovo codice per nuovo partecipante
    const newCode = generatePlayerCode();
    setAssignedCode(newCode);
    setNicknameInput(`Giocatore ${newCode}`);
    if (roomParam) {
      setRoomCodeInput(roomParam.toUpperCase());
    }
  }, [roomParam]);

  // Hook sincronizzazione stanza di gioco
  const {
    room,
    isOnline,
    submitVote,
  } = useGameRoom({
    roomCode: playerSession?.roomCode || '',
    isHost: false,
    playerSession,
  });

  // Verifica se il giocatore ha già votato in questo round (da stato stanza o da localStorage)
  useEffect(() => {
    if (!room || !playerSession) return;

    const roundNum = room.currentRound;
    const voteFromRoom = room.round?.votes?.[playerSession.playerId];
    const voteFromLocal = playerSession.savedVotes?.[roundNum];

    if (voteFromRoom !== undefined) {
      setSelectedDimension(voteFromRoom.dimensionIndex);
      setHasVotedCurrentRound(true);
    } else if (voteFromLocal !== undefined) {
      setSelectedDimension(voteFromLocal);
      setHasVotedCurrentRound(true);
    } else {
      // Nuovo round: resetta selezione
      setSelectedDimension(null);
      setHasVotedCurrentRound(false);
    }
  }, [room?.currentRound, room?.round?.votes, playerSession]);

  // Effetto celebrazione se il giocatore riceve punteggio nel round
  useEffect(() => {
    if (room?.status === 'scored' && playerSession && hasVotedCurrentRound && selectedDimension !== null) {
      const score = room.round?.correctness?.[selectedDimension] ?? 0;
      if (score > 0) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    }
  }, [room?.status, playerSession, hasVotedCurrentRound, selectedDimension]);

  // Invio Form di Ingresso Partecipante
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = roomCodeInput.trim().toUpperCase();
    if (!targetRoom) {
      setJoinError('Inserisci il codice della stanza');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    const playerId = `player-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const finalCode = assignedCode || generatePlayerCode();
    const finalNickname = nicknameInput.trim() || `Giocatore ${finalCode}`;

    try {
      const res = await fetch(`/api/rooms/${targetRoom}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          playerCode: finalCode,
          nickname: finalNickname,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setJoinError(data.error || 'Impossibile entrare nella stanza. Verifica il codice.');
        setIsJoining(false);
        return;
      }

      const session: PlayerSession = {
        playerId,
        playerCode: finalCode,
        nickname: finalNickname,
        roomCode: targetRoom,
        joinedAt: Date.now(),
        savedVotes: {},
      };

      savePlayerSession(session);
      setPlayerSession(session);
    } catch (err) {
      console.error('Errore join:', err);
      setJoinError('Errore di connessione al server.');
    } finally {
      setIsJoining(false);
    }
  };

  // Voto del giocatore su una dimensione
  const handleCastVote = async () => {
    if (selectedDimension === null || !playerSession) return;
    setIsSubmittingVote(true);
    const success = await submitVote(selectedDimension);
    setIsSubmittingVote(false);
    if (success) {
      setHasVotedCurrentRound(true);
    }
  };

  // Uscita / Cambio Stanza
  const handleLeaveRoom = () => {
    if (confirm('Vuoi uscire dalla partita?')) {
      clearPlayerSession();
      setPlayerSession(null);
      const newCode = generatePlayerCode();
      setAssignedCode(newCode);
      setNicknameInput(`Giocatore ${newCode}`);
    }
  };

  // Dati del partecipante corrente
  const myParticipant = playerSession && room?.participants?.[playerSession.playerId];
  const participantsList = room ? Object.values(room.participants) : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Bar Mobile */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white text-sm shadow">
            RG
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Radar Challenge</h1>
            {playerSession && (
              <p className="text-[11px] font-mono text-indigo-400">
                Stanza: <strong>{playerSession.roomCode}</strong> • Tu: <strong>{playerSession.playerCode}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Indicatore Connessione Rete */}
          <div
            title={isOnline ? 'Online - Dati sincronizzati' : 'Offline - Salvataggio locale attivo'}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
              isOnline
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                : 'bg-red-950/60 border-red-500/30 text-red-400 animate-pulse'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {playerSession && (
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition"
              title="Esci dalla stanza"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full flex flex-col justify-center">
        {!playerSession ? (
          /* =========================================================================
             FORM DI ACCESSO PARTECIPANTE (SCAN QR O CODICE MANUALE)
             ========================================================================= */
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl my-auto">
            <div className="flex items-center gap-2 mb-3 text-indigo-400">
              <Smartphone className="w-5 h-5" />
              <h2 className="text-lg font-bold text-white">Unisciti alla Partita</h2>
            </div>
            <p className="text-xs text-zinc-400 mb-6">
              Inserisci il codice della stanza o conferma i tuoi dati per ricevere il tuo codice alfanumerico univoco.
            </p>

            {joinError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300">
                {joinError}
              </div>
            )}

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Codice Stanza
                </label>
                <input
                  type="text"
                  placeholder="Es. R-7K2X"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono text-center text-lg tracking-widest placeholder-zinc-500 focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Il tuo Nickname
                </label>
                <input
                  type="text"
                  placeholder="Nome visualizzato"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/60 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Codice Alfanumerico:</span>
                <span className="font-mono font-bold text-indigo-400">{assignedCode}</span>
              </div>

              <button
                type="submit"
                disabled={isJoining}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {isJoining ? 'Connessione...' : 'Entra in Partita'}
              </button>
            </form>

            <p className="text-[11px] text-zinc-500 text-center mt-4">
              I dati sono memorizzati in locale: se perdi la connessione ti ricolleghi automaticamente senza perdere punti.
            </p>
          </div>
        ) : (
          /* =========================================================================
             SCHERMATA DI GIOCO ATTIVA PER IL GIOCATORE SU SMARTPHONE
             ========================================================================= */
          <div className="space-y-4 py-2">
            {/* Scheda Giocatore & Punteggio */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/30 flex items-center justify-center font-mono font-bold text-indigo-400 text-sm">
                  {playerSession.playerCode.replace('P-', '')}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{playerSession.nickname}</h3>
                  <span className="text-[11px] font-mono text-zinc-400">{playerSession.playerCode}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-zinc-400">Punti Totali</div>
                <div className="text-xl font-black text-amber-400">
                  {(myParticipant?.totalScore || 0).toFixed(1)}{' '}
                  <span className="text-xs font-normal text-zinc-400">pt</span>
                </div>
              </div>
            </div>

            {/* Scheda Domanda Corrente */}
            <div className="bg-gradient-to-br from-zinc-900 to-indigo-950/30 border border-zinc-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs uppercase tracking-wider border border-indigo-500/30">
                  Round {room?.currentRound || 1}
                </span>

                {room?.status === 'voting' ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    Votazione Aperta
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Risultati Pubblicati
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                {room?.currentQuestion || 'In attesa della prima domanda da parte dell\'Host...'}
              </h2>
            </div>

            {/* SEZIONE VOTAZIONE: DIMENSIONI DEL GRAFO RADAR */}
            {room && room.dimensions && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <span>Scegli una dimensione per votare:</span>
                  {hasVotedCurrentRound && (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Voto Registrato
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {room.dimensions.map((dimName, idx) => {
                    const isSelected = selectedDimension === idx;
                    const palette = DIMENSION_PALETTES[idx % DIMENSION_PALETTES.length];
                    const correctnessScore = room.round?.correctness?.[idx];
                    const isScored = room.status === 'scored';

                    let cardBorder = isSelected
                      ? 'border-indigo-500 bg-indigo-950/50 shadow-md ring-1 ring-indigo-500'
                      : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800/80';

                    if (isScored && correctnessScore !== undefined) {
                      if (correctnessScore === 1) {
                        cardBorder = 'border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-500';
                      } else if (correctnessScore === 0.5) {
                        cardBorder = 'border-amber-500 bg-amber-950/40 text-amber-300 ring-1 ring-amber-500';
                      }
                    }

                    return (
                      <button
                        key={`vote-dim-${idx}`}
                        type="button"
                        disabled={hasVotedCurrentRound || room.status !== 'voting'}
                        onClick={() => setSelectedDimension(idx)}
                        className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer disabled:cursor-default ${cardBorder}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: palette.main }}
                          />
                          <span className="font-semibold text-sm text-white truncate">
                            {dimName}
                          </span>
                        </div>

                        {/* Indicatore Stato Voto o Correttezza */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isScored && correctnessScore !== undefined && (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                correctnessScore === 1
                                  ? 'bg-emerald-500 text-black'
                                  : correctnessScore === 0.5
                                  ? 'bg-amber-500 text-black'
                                  : 'text-zinc-500'
                              }`}
                            >
                              {correctnessScore === 1 ? '1.0 pt (Corretta)' : correctnessScore === 0.5 ? '0.5 pt (Metà)' : '0 pt'}
                            </span>
                          )}

                          {isSelected && !isScored && (
                            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Pulsante Conferma Voto */}
                {!hasVotedCurrentRound && room.status === 'voting' && (
                  <button
                    type="button"
                    disabled={selectedDimension === null || isSubmittingVote}
                    onClick={handleCastVote}
                    className="w-full mt-3 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <span>
                      {selectedDimension !== null
                        ? `Conferma Voto per "${room.dimensions[selectedDimension]}"`
                        : 'Seleziona una dimensione'}
                    </span>
                  </button>
                )}

                {/* Feedback Risultato del Round dopo la rivelazione */}
                {room.status === 'scored' && selectedDimension !== null && (
                  <div className="mt-4 p-4 rounded-xl border bg-zinc-900 shadow-xl">
                    {(() => {
                      const score = room.round?.correctness?.[selectedDimension] ?? 0;
                      if (score === 1) {
                        return (
                          <div className="flex items-center gap-3 text-emerald-300">
                            <Sparkles className="w-6 h-6 text-emerald-400 shrink-0" />
                            <div>
                              <div className="font-bold text-sm">Complimenti! Risposta Esatta!</div>
                              <div className="text-xs text-zinc-400">
                                Hai votato la dimensione target corretta (+1.0 punto).
                              </div>
                            </div>
                          </div>
                        );
                      } else if (score === 0.5) {
                        return (
                          <div className="flex items-center gap-3 text-amber-300">
                            <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
                            <div>
                              <div className="font-bold text-sm">Buona intuizione! Risposta Parziale!</div>
                              <div className="text-xs text-zinc-400">
                                Hai ottenuto mezzo punto (+0.5 pt).
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex items-center gap-3 text-zinc-300">
                            <HelpCircle className="w-6 h-6 text-zinc-500 shrink-0" />
                            <div>
                              <div className="font-bold text-sm">Risposta non corretta (0 pt)</div>
                              <div className="text-xs text-zinc-400">
                                In attesa della prossima domanda per rifarti!
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Toggle Visualizzazione Radar Graph su Smartphone */}
            {room && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowRadarOnMobile(!showRadarOnMobile)}
                  className="w-full py-2 px-3 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-semibold text-zinc-300 flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Eye className="w-4 h-4 text-indigo-400" />
                  <span>{showRadarOnMobile ? 'Nascondi Grafico Radar' : 'Visualizza Grafico Radar su Smartphone'}</span>
                </button>

                {showRadarOnMobile && (
                  <div className="mt-3 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center">
                    <RadarChart
                      numDimensions={room.numDimensions}
                      dimensions={room.dimensions}
                      votes={(() => {
                        const counts: Record<number, number> = {};
                        const isCumulative = room.cumulativeMode ?? true;
                        if (isCumulative && room.roundHistory) {
                          room.roundHistory.forEach((pastRound) => {
                            if (pastRound.votes) {
                              Object.values(pastRound.votes).forEach((v) => {
                                counts[v.dimensionIndex] = (counts[v.dimensionIndex] || 0) + 1;
                              });
                            }
                          });
                        }
                        if (room.round?.votes) {
                          Object.values(room.round.votes).forEach((v) => {
                            counts[v.dimensionIndex] = (counts[v.dimensionIndex] || 0) + 1;
                          });
                        }
                        return counts;
                      })()}
                      totalVoters={(() => {
                        const isCumulative = room.cumulativeMode ?? true;
                        let count = 0;
                        if (isCumulative && room.roundHistory) {
                          room.roundHistory.forEach((pastRound) => {
                            count += Object.keys(pastRound.votes || {}).length;
                          });
                        }
                        count += Object.keys(room.round?.votes || {}).length;
                        return count;
                      })()}
                      correctness={room.round?.correctness || {}}
                      showVotes={true}
                      showCorrectness={room.status === 'scored'}
                      size={360}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Classifica dei Giocatori */}
            {room && (
              <div className="mt-6">
                <Leaderboard
                  participants={participantsList}
                  currentRoundVotes={room.round?.votes}
                  highlightPlayerId={playerSession.playerId}
                  isVotingActive={room.status === 'voting'}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Caricamento...</div>}>
      <PlayerContent />
    </Suspense>
  );
}
