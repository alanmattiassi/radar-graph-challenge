'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RoomState, CorrectnessScore, PlayerSession, Participant } from '@/types/game';
import { getSavedPlayerSession, savePlayerSession, saveHostSession } from '@/lib/storage';
import type { DataConnection, Peer as PeerType } from 'peerjs';

interface UseGameRoomOptions {
  roomCode: string;
  isHost?: boolean;
  playerSession?: PlayerSession | null;
}

// Genera un Peer ID deterministico e pulito per l'Host della stanza
export function getHostPeerId(roomCode: string): string {
  const clean = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `RADAR-ROOM-${clean}`;
}

export function useGameRoom({ roomCode, isHost = false, playerSession }: UseGameRoomOptions) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [p2pConnected, setP2pConnected] = useState<boolean>(false);

  const roomRef = useRef<RoomState | null>(null);
  roomRef.current = room;

  // Riferimenti per connessioni WebRTC
  const peerInstanceRef = useRef<PeerType | null>(null);
  const hostConnectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const clientConnectionRef = useRef<DataConnection | null>(null);

  // Broadcast dell'Host a tutti i partecipanti connessi via WebRTC
  const broadcastToPeers = useCallback((msg: { type: string; room: RoomState }) => {
    hostConnectionsRef.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(msg);
        } catch (e) {
          console.warn('Errore broadcast su peer:', e);
        }
      }
    });
  }, []);

  // Fetch di fallback tramite API Next.js interna
  const fetchRoomState = useCallback(async () => {
    if (!roomCode) return;
    try {
      const res = await fetch(`/api/rooms/${roomCode}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Stanza non trovata. Verifica il codice.');
        }
        return;
      }
      const data = await res.json();
      if (data.success && data.room) {
        // Se non abbiamo ancora la stanza o se i dati API sono più recenti
        setRoom((prev) => {
          if (!prev || (data.room.updatedAt && data.room.updatedAt > (prev.updatedAt || 0))) {
            return data.room;
          }
          return prev;
        });
        setError(null);
        setIsOnline(true);

        if (isHost) {
          saveHostSession(data.room);
        }
      }
    } catch {
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, [roomCode, isHost]);

  // Inizializzazione WebRTC Peer-to-Peer
  useEffect(() => {
    if (!roomCode || typeof window === 'undefined') return;

    let isMounted = true;
    let peer: PeerType | null = null;

    const setupP2P = async () => {
      try {
        const PeerJS = (await import('peerjs')).default;
        const targetHostId = getHostPeerId(roomCode);

        if (isHost) {
          // --- RUOLO HOST ---
          peer = new PeerJS(targetHostId, {
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
              ],
            },
          });

          peer.on('open', () => {
            if (isMounted) setP2pConnected(true);
          });

          peer.on('connection', (conn) => {
            hostConnectionsRef.current.set(conn.peer, conn);

            conn.on('open', () => {
              // Invia lo stato corrente della stanza al nuovo arrivato
              if (roomRef.current) {
                conn.send({ type: 'SYNC', room: roomRef.current });
              }
            });

            conn.on('data', (data: any) => {
              if (!data || !data.type) return;

              // Messaggio: Partecipante entra nella stanza
              if (data.type === 'JOIN' && data.player) {
                setRoom((currentRoom) => {
                  if (!currentRoom) return null;
                  const p: Participant = {
                    id: data.player.playerId,
                    roomCode: currentRoom.code,
                    playerCode: data.player.playerCode,
                    nickname: data.player.nickname,
                    totalScore: currentRoom.participants[data.player.playerId]?.totalScore || 0,
                    lastSeen: new Date().toISOString(),
                  };
                  const updated: RoomState = {
                    ...currentRoom,
                    participants: {
                      ...currentRoom.participants,
                      [p.id]: p,
                    },
                    updatedAt: Date.now(),
                  };
                  saveHostSession(updated);
                  broadcastToPeers({ type: 'SYNC', room: updated });
                  return updated;
                });
              }

              // Messaggio: Partecipante invia un voto
              if (data.type === 'VOTE' && data.participantId !== undefined) {
                setRoom((currentRoom) => {
                  if (!currentRoom) return null;
                  const updated: RoomState = {
                    ...currentRoom,
                    round: {
                      ...currentRoom.round,
                      votes: {
                        ...currentRoom.round.votes,
                        [data.participantId]: {
                          participantId: data.participantId,
                          playerCode: data.playerCode,
                          nickname: data.nickname,
                          dimensionIndex: data.dimensionIndex,
                        },
                      },
                    },
                    updatedAt: Date.now(),
                  };
                  saveHostSession(updated);
                  broadcastToPeers({ type: 'SYNC', room: updated });
                  return updated;
                });
              }
            });

            conn.on('close', () => {
              hostConnectionsRef.current.delete(conn.peer);
            });
          });

          peer.on('error', (err) => {
            console.warn('PeerJS Host warning:', err.type);
          });
        } else {
          // --- RUOLO GIOCATORE / SMARTPHONE ---
          peer = new PeerJS({
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
              ],
            },
          });

          peer.on('open', () => {
            const conn = peer!.connect(targetHostId, { reliable: true });
            clientConnectionRef.current = conn;

            conn.on('open', () => {
              if (isMounted) setP2pConnected(true);

              // Invia i dati del giocatore registrato
              if (playerSession) {
                conn.send({
                  type: 'JOIN',
                  player: playerSession,
                });
              }
            });

            conn.on('data', (data: any) => {
              if (data && data.type === 'SYNC' && data.room) {
                setRoom(data.room);
                setLoading(false);
                setIsOnline(true);
              }
            });

            conn.on('close', () => {
              if (isMounted) setP2pConnected(false);
            });
          });

          peer.on('error', (err) => {
            console.warn('PeerJS Client warning:', err.type);
          });
        }

        peerInstanceRef.current = peer;
      } catch (err) {
        console.warn('Inizializzazione WebRTC fallita, uso polling fallback:', err);
      }
    };

    setupP2P();
    fetchRoomState();

    // Polling periodico HTTP (garantisce sincronizzazione anche in caso di timeout P2P)
    const interval = setInterval(() => {
      fetchRoomState();
    }, 2000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRoomState();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', fetchRoomState);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', fetchRoomState);

      if (peerInstanceRef.current) {
        peerInstanceRef.current.destroy();
      }
    };
  }, [roomCode, isHost, playerSession, broadcastToPeers, fetchRoomState]);

  // Invio voto del partecipante (via WebRTC P2P + fallback HTTP)
  const submitVote = async (dimensionIndex: number): Promise<boolean> => {
    if (!roomCode || !playerSession) return false;

    // 1. Invio istantaneo via WebRTC DataChannel all'Host
    if (clientConnectionRef.current && clientConnectionRef.current.open) {
      try {
        clientConnectionRef.current.send({
          type: 'VOTE',
          participantId: playerSession.playerId,
          playerCode: playerSession.playerCode,
          nickname: playerSession.nickname,
          dimensionIndex,
        });
      } catch (e) {
        console.warn('Invio voto P2P non riuscito, fallback su HTTP:', e);
      }
    }

    // 2. Invio di sicurezza via API HTTP
    try {
      const res = await fetch(`/api/rooms/${roomCode}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundNumber: room?.currentRound || 1,
          participantId: playerSession.playerId,
          playerCode: playerSession.playerCode,
          nickname: playerSession.nickname,
          dimensionIndex,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.room) {
          setRoom(data.room);
        }
      }
    } catch {
      // Ignora errore se già inviato via P2P
    }

    // 3. Salva voto sul localStorage del singolo dispositivo
    const currentSaved = getSavedPlayerSession() || playerSession;
    currentSaved.savedVotes = {
      ...currentSaved.savedVotes,
      [room?.currentRound || 1]: dimensionIndex,
    };
    savePlayerSession(currentSaved);

    return true;
  };

  // Azione Host: assegnazione punteggi e calcolo classifica
  const submitScores = async (correctness: Record<number, CorrectnessScore>): Promise<boolean> => {
    if (!roomCode || !room) return false;

    // Calcolo locale istantaneo per l'Host
    const correctnessMap: Record<number, CorrectnessScore> = {};
    for (let i = 0; i < room.numDimensions; i++) {
      const val = Number(correctness[i] ?? 0);
      correctnessMap[i] = (val === 1 || val === 0.5 ? val : 0) as CorrectnessScore;
    }

    const updatedParticipants = { ...room.participants };
    const votes = room.round.votes || {};

    Object.values(votes).forEach((vote) => {
      const score = correctnessMap[vote.dimensionIndex] ?? 0;
      vote.scoreAwarded = score;
      if (updatedParticipants[vote.participantId]) {
        const p = updatedParticipants[vote.participantId];
        p.totalScore = Number(((p.totalScore || 0) + score).toFixed(1));
        p.lastRoundScore = score;
      }
    });

    const updatedRoom: RoomState = {
      ...room,
      status: 'scored',
      participants: updatedParticipants,
      round: {
        ...room.round,
        status: 'scored',
        correctness: correctnessMap,
      },
      updatedAt: Date.now(),
    };

    setRoom(updatedRoom);
    saveHostSession(updatedRoom);

    // Broadcast istantaneo via WebRTC a tutti gli smartphone
    broadcastToPeers({ type: 'SYNC', room: updatedRoom });

    // Sincronizza anche con l'API in memoria
    try {
      fetch(`/api/rooms/${roomCode}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundNumber: room.currentRound,
          correctness: correctnessMap,
        }),
      });
    } catch {
      // Fallback
    }

    return true;
  };

  // Azione Host: avanza alla prossima domanda
  const nextQuestion = async (nextQuestionText: string): Promise<boolean> => {
    if (!roomCode || !room) return false;

    const history = room.roundHistory ? [...room.roundHistory] : [];
    if (room.round) {
      history.push({
        roundNumber: room.round.roundNumber,
        questionText: room.round.questionText,
        status: room.round.status,
        votes: { ...room.round.votes },
        correctness: { ...room.round.correctness },
      });
    }

    const nextRoundNum = room.currentRound + 1;
    const updatedRoom: RoomState = {
      ...room,
      currentRound: nextRoundNum,
      currentQuestion: nextQuestionText,
      status: 'voting',
      roundHistory: history,
      round: {
        roundNumber: nextRoundNum,
        questionText: nextQuestionText,
        status: 'voting',
        votes: {},
        correctness: {},
      },
      updatedAt: Date.now(),
    };

    setRoom(updatedRoom);
    saveHostSession(updatedRoom);

    // Broadcast a tutti gli smartphone
    broadcastToPeers({ type: 'SYNC', room: updatedRoom });

    try {
      fetch(`/api/rooms/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextQuestion: nextQuestionText }),
      });
    } catch {
      // Fallback
    }

    return true;
  };

  // Azione Host: attiva / disattiva la modalità riempimento cumulativo dai round precedenti
  const toggleCumulativeMode = async (enabled?: boolean): Promise<boolean> => {
    if (!room) return false;
    const currentMode = room.cumulativeMode ?? true;
    const newMode = enabled !== undefined ? enabled : !currentMode;

    const updatedRoom: RoomState = {
      ...room,
      cumulativeMode: newMode,
      updatedAt: Date.now(),
    };

    setRoom(updatedRoom);
    saveHostSession(updatedRoom);
    broadcastToPeers({ type: 'SYNC', room: updatedRoom });

    try {
      fetch(`/api/rooms/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cumulativeMode: newMode }),
      });
    } catch {
      // Fallback
    }

    return true;
  };

  return {
    room,
    loading,
    error,
    isOnline,
    p2pConnected,
    refreshRoom: fetchRoomState,
    submitVote,
    submitScores,
    nextQuestion,
    toggleCumulativeMode,
  };
}
