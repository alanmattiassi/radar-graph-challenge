'use client';

import React from 'react';
import { Participant } from '@/types/game';
import { Trophy, Medal, Award, CheckCircle2, Clock } from 'lucide-react';

interface LeaderboardProps {
  participants: Participant[];
  currentRoundVotes?: Record<string, unknown>; // id partecipante presente se ha già votato
  highlightPlayerId?: string; // per evidenziare se stesso nella vista giocatore
  isVotingActive?: boolean;
}

export default function Leaderboard({
  participants,
  currentRoundVotes = {},
  highlightPlayerId,
  isVotingActive = false,
}: LeaderboardProps) {
  // Ordina i partecipanti per punteggio decrescente, e a parità di punti per ordine alfabetico
  const sorted = [...participants].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return a.playerCode.localeCompare(b.playerCode);
  });

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Classifica Punti</h3>
            <p className="text-xs text-zinc-400">
              {participants.length} {participants.length === 1 ? 'partecipante' : 'partecipanti collegati'}
            </p>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 text-sm">
          Nessun partecipante ancora collegato.
          <br />
          Condividi il QR Code per farli unire!
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[460px] pr-1">
          {sorted.map((p, index) => {
            const rank = index + 1;
            const hasVoted = Boolean(currentRoundVotes[p.id]);
            const isMe = p.id === highlightPlayerId;

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  isMe
                    ? 'bg-indigo-950/60 border-indigo-500/60 shadow-lg ring-1 ring-indigo-500/30'
                    : 'bg-zinc-800/60 border-zinc-700/40 hover:bg-zinc-800'
                }`}
              >
                {/* Posizione e Dati Partecipante */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Badge Posizione */}
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs shrink-0">
                    {rank === 1 ? (
                      <span className="text-yellow-400 flex items-center justify-center">
                        <Trophy className="w-4 h-4" />
                      </span>
                    ) : rank === 2 ? (
                      <span className="text-zinc-300 flex items-center justify-center">
                        <Medal className="w-4 h-4" />
                      </span>
                    ) : rank === 3 ? (
                      <span className="text-amber-600 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-zinc-400">#{rank}</span>
                    )}
                  </div>

                  {/* Nome e Codice Alfanumerico */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white text-sm truncate">
                        {p.nickname}
                      </span>
                      {isMe && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500 text-white">
                          TU
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400">
                      Cod: {p.playerCode}
                    </div>
                  </div>
                </div>

                {/* Punteggio e Stato Voto */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Indicatore se ha votato nel round corrente */}
                  {isVotingActive && (
                    <div
                      title={hasVoted ? 'Ha votato' : 'In attesa del voto'}
                      className="flex items-center"
                    >
                      {hasVoted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-zinc-500 animate-pulse" />
                      )}
                    </div>
                  )}

                  {/* Punteggio Totale e Ultimo Guadagno */}
                  <div className="text-right">
                    <div className="font-extrabold text-amber-400 text-sm">
                      {p.totalScore.toFixed(1)}{' '}
                      <span className="text-xs font-normal text-zinc-400">pt</span>
                    </div>
                    {p.lastRoundScore !== undefined && p.lastRoundScore > 0 && (
                      <span className="text-[10px] font-bold text-emerald-400">
                        +{p.lastRoundScore} pt
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
