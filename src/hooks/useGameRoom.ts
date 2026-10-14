'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RoomState, CorrectnessScore, PlayerSession, Participant, VoteRecord } from '@/types/game';
import { getSavedPlayerSession, savePlayerSession, saveHostSession, getSavedHostSession } from '@/lib/storage';
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
  const [room, setRoom] = useState<RoomState | null>(() => {
    if (isHost && typeof window !== 'undefined' && roomCode) {
      const saved = getSavedHostSession();
      if (saved && saved.code?.toUpperCase() === roomCode.toUpperCase()) {
        return saved;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [p2pConnected, setP2pConnected] = useState<boolean>(false);

  const roomRef = useRef<RoomState | null>(room);
  roomRef.current = room;

  // Inizializza o aggiorna manualmente la stanza (utilizzato subito dopo la creazione)
  const initRoom = useCallback((newRoom: RoomState) => {
    setRoom(newRoom);
    roomRef.current = newRoom;
    setLoading(false);
    setError(null);
    saveHostSession(newRoom);
  }, []);

  // Ripristina da localStorage per l'Host quando roomCode diventa disponibile
  useEffect(() => {
    if (isHost && roomCode && !room) {
      const saved = getSavedHostSession();
      if (saved && saved.code?.toUpperCase() === roomCode.toUpperCase()) {
        setRoom(saved);
        roomRef.current = saved;
        setLoading(false);
        setError(null);
      }
    }
  }, [isHost, roomCode, room]);

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
        // Non sovrascrivere l'errore se siamo l'Host o se la stanza è già caricata/connessa
        if (!isHost && res.status === 404 && !roomRef.current && !clientConnectionRef.current?.open) {
          setError('Stanza non trovata. Verifica il codice.');
        }
        return;
      }
      const data = await res.json();
      if (data.success && data.room) {
        if (isHost) {
          // L'Host è la sorgente primaria di verità del round e dello stato!
          // Unisce partecipanti e voti inviati via fallback HTTP senza MAI retrocedere di round
          setRoom((prev) => {
            if (!prev) return data.room;
            // REGOLA TASSATIVA: Non retrocedere MAI a un round precedente se l'Host è già avanti
            if (data.room.currentRound < prev.currentRound) {
              return prev;
            }

            let hasChanges = false;
            const mergedParticipants = { ...prev.participants };
            if (data.room.participants) {
              Object.values(data.room.participants as Record<string, Participant>).forEach((sp) => {
                if (!mergedParticipants[sp.id] || (sp.totalScore !== undefined && sp.totalScore > (mergedParticipants[sp.id].totalScore || 0))) {
                  mergedParticipants[sp.id] = sp;
                  hasChanges = true;
                }
              });
            }

            const mergedVotes = { ...(prev.round?.votes || {}) };
            if (prev.currentRound === data.room.currentRound && data.room.round?.votes) {
              Object.values(data.room.round.votes as Record<string, any>).forEach((sv) => {
                if (!mergedVotes[sv.participantId]) {
                  mergedVotes[sv.participantId] = sv;
                  hasChanges = true;
                }
              });
            }

            if (hasChanges) {
              const updated: RoomState = {
                ...prev,
                participants: mergedParticipants,
                round: {
                  ...prev.round,
                  votes: mergedVotes,
                },
                updatedAt: Date.now(),
              };
              saveHostSession(updated);
              broadcastToPeers({ type: 'SYNC', room: updated });
              return updated;
            }
            return prev;
          });
        } else {
          // Vista Partecipante: accetta se il round è più avanzato o se updatedAt è più recente
          setRoom((prev) => {
            if (!prev) return data.room;
            if (data.room.currentRound > prev.currentRound) {
              return data.room;
            }
            if (data.room.updatedAt && data.room.updatedAt > (prev.updatedAt || 0)) {
              return data.room;
            }
            return prev;
          });
        }
        setError(null);
        setIsOnline(true);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, [roomCode, isHost, broadcastToPeers]);

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
              const toSend = roomRef.current || (isHost ? getSavedHostSession() : null);
              if (toSend) {
                conn.send({ type: 'SYNC', room: toSend });
              }
            });

            conn.on('data', (data: any) => {
              if (!data || !data.type) return;

              // Messaggio: Partecipante entra nella stanza
              if (data.type === 'JOIN' && data.player) {
                setRoom((currentRoom) => {
                  const baseRoom = currentRoom || (isHost ? getSavedHostSession() : null);
                  if (!baseRoom) return null;
                  const p: Participant = {
                    id: data.player.playerId,
                    roomCode: baseRoom.code,
                    playerCode: data.player.playerCode,
                    nickname: data.player.nickname,
                    totalScore: baseRoom.participants[data.player.playerId]?.totalScore || 0,
                    lastSeen: new Date().toISOString(),
                  };
                  const updated: RoomState = {
                    ...baseRoom,
                    participants: {
                      ...baseRoom.participants,
                      [p.id]: p,
                    },
                    updatedAt: Date.now(),
                  };
                  saveHostSession(updated);
                  broadcastToPeers({ type: 'SYNC', room: updated });

                  // Sincronizza anche con il server per i client HTTP
                  try {
                    fetch(`/api/rooms/${baseRoom.code}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ room: updated }),
                    });
                  } catch {
                    // ignore
                  }

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
    // Sincronizzazione cross-window per Host (Schermo Proiezione <-> Finestra Regia Separata)
    let hostChannel: BroadcastChannel | null = null;
    if (isHost && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        hostChannel = new BroadcastChannel(`radar_host_bus_${roomCode.toUpperCase()}`);
        hostChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'HOST_SYNC' && event.data.room) {
            setRoom(event.data.room);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel init warning:', e);
      }
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (isHost && e.key === 'radar_game_host_session' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as RoomState;
          if (parsed && parsed.code?.toUpperCase() === roomCode.toUpperCase()) {
            setRoom(parsed);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', fetchRoomState);
      window.removeEventListener('storage', handleStorageEvent);
      if (hostChannel) {
        hostChannel.close();
      }

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
    const currentRoom = roomRef.current || room || (isHost ? getSavedHostSession() : null);
    if (!roomCode || !currentRoom) return false;

    // Calcolo locale istantaneo per l'Host
    const correctnessMap: Record<number, CorrectnessScore> = {};
    for (let i = 0; i < currentRoom.numDimensions; i++) {
      const val = Number(correctness[i] ?? 0);
      correctnessMap[i] = (val === 1 || val === 0.5 ? val : 0) as CorrectnessScore;
    }

    const updatedParticipants = { ...currentRoom.participants };
    const votes = currentRoom.round?.votes || {};

    Object.values(votes as Record<string, VoteRecord>).forEach((vote) => {
      const score = correctnessMap[vote.dimensionIndex] ?? 0;
      vote.scoreAwarded = score;
      if (updatedParticipants[vote.participantId]) {
        const p = updatedParticipants[vote.participantId];
        p.totalScore = Number(((p.totalScore || 0) + score).toFixed(1));
        p.lastRoundScore = score;
      }
    });

    const updatedRoom: RoomState = {
      ...currentRoom,
      status: 'scored',
      participants: updatedParticipants,
      round: {
        ...currentRoom.round,
        status: 'scored',
        correctness: correctnessMap,
      },
      updatedAt: Date.now(),
    };

    setRoom(updatedRoom);
    saveHostSession(updatedRoom);

    // Broadcast istantaneo via WebRTC a tutti gli smartphone
    broadcastToPeers({ type: 'SYNC', room: updatedRoom });

    // Notifica istantanea BroadcastChannel per finestre Host (Regia <-> Proiezione)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(`radar_host_bus_${roomCode.toUpperCase()}`);
        bc.postMessage({ type: 'HOST_SYNC', room: updatedRoom });
        bc.close();
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // Salva con certezza autorevole sul server via PUT
    try {
      await fetch(`/api/rooms/${roomCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: updatedRoom }),
      });
    } catch (e) {
      console.warn('Errore salvataggio server score:', e);
    }

    return true;
  };

  // Azione Host: avanza alla prossima domanda
  const nextQuestion = async (nextQuestionText: string): Promise<boolean> => {
    const currentRoom = roomRef.current || room || (isHost ? getSavedHostSession() : null);
    if (!roomCode || !currentRoom) return false;

    const history = currentRoom.roundHistory ? [...currentRoom.roundHistory] : [];
    if (currentRoom.round) {
      history.push({
        roundNumber: currentRoom.round.roundNumber,
        questionText: currentRoom.round.questionText,
        status: currentRoom.round.status,
        votes: { ...(currentRoom.round.votes || {}) },
        correctness: { ...(currentRoom.round.correctness || {}) },
      });
    }

    const nextRoundNum = currentRoom.currentRound + 1;
    const updatedRoom: RoomState = {
      ...currentRoom,
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

    // Broadcast istantaneo via WebRTC a tutti gli smartphone
    broadcastToPeers({ type: 'SYNC', room: updatedRoom });

    // Notifica istantanea BroadcastChannel per finestre Host (Regia <-> Proiezione)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(`radar_host_bus_${roomCode.toUpperCase()}`);
        bc.postMessage({ type: 'HOST_SYNC', room: updatedRoom });
        bc.close();
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // Salva con certezza autorevole sul server via PUT
    try {
      await fetch(`/api/rooms/${roomCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: updatedRoom }),
      });
    } catch (e) {
      console.warn('Errore salvataggio server nextQuestion:', e);
    }

    return true;
  };

  // Azione Host: attiva / disattiva la modalità riempimento cumulativo dai round precedenti
  const toggleCumulativeMode = async (enabled?: boolean): Promise<boolean> => {
    const currentRoom = roomRef.current || room || (isHost ? getSavedHostSession() : null);
    if (!currentRoom || !roomCode) return false;
    const currentMode = currentRoom.cumulativeMode ?? true;
    const newMode = enabled !== undefined ? enabled : !currentMode;

    const updatedRoom: RoomState = {
      ...currentRoom,
      cumulativeMode: newMode,
      updatedAt: Date.now(),
    };

    setRoom(updatedRoom);
    saveHostSession(updatedRoom);
    broadcastToPeers({ type: 'SYNC', room: updatedRoom });

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(`radar_host_bus_${roomCode.toUpperCase()}`);
        bc.postMessage({ type: 'HOST_SYNC', room: updatedRoom });
        bc.close();
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    try {
      await fetch(`/api/rooms/${roomCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: updatedRoom }),
      });
    } catch (e) {
      console.warn('Errore salvataggio server cumulativeMode:', e);
    }

    return true;
  };

  return {
    room,
    loading,
    error,
    isOnline,
    p2pConnected,
    initRoom,
    refreshRoom: fetchRoomState,
    submitVote,
    submitScores,
    nextQuestion,
    toggleCumulativeMode,
  };
}
