'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RoomState, CorrectnessScore, PlayerSession } from '@/types/game';
import { getSupabaseClient } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getSavedPlayerSession, savePlayerSession, saveHostSession } from '@/lib/storage';

interface UseGameRoomOptions {
  roomCode: string;
  isHost?: boolean;
  playerSession?: PlayerSession | null;
}

export function useGameRoom({ roomCode, isHost = false, playerSession }: UseGameRoomOptions) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const roomRef = useRef<RoomState | null>(null);
  roomRef.current = room;

  // Fetch dello stato corrente della stanza da API
  const fetchRoomState = useCallback(async () => {
    if (!roomCode) return;
    try {
      const res = await fetch(`/api/rooms/${roomCode}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Stanza non trovata. Verifica il codice.');
        } else {
          setError('Errore di connessione alla stanza.');
        }
        return;
      }
      const data = await res.json();
      if (data.success && data.room) {
        setRoom(data.room);
        setError(null);
        setIsOnline(true);

        // Salva in locale sul dispositivo
        if (isHost) {
          saveHostSession(data.room);
        }
      }
    } catch (err) {
      console.warn('Errore fetch stanza:', err);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, [roomCode, isHost]);

  // Sottoscrizione Realtime con Supabase (o polling fallback)
  useEffect(() => {
    if (!roomCode) return;

    fetchRoomState();

    const supabase = getSupabaseClient();
    let channel: RealtimeChannel | null = null;

    if (supabase) {
      // Configurazione canale broadcast / realtime Postgres
      channel = supabase
        .channel(`room_${roomCode.toUpperCase()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${roomCode.toUpperCase()}` },
          () => {
            fetchRoomState();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'participants', filter: `room_code=eq.${roomCode.toUpperCase()}` },
          () => {
            fetchRoomState();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'votes', filter: `room_code=eq.${roomCode.toUpperCase()}` },
          () => {
            fetchRoomState();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsOnline(true);
          }
        });
    }

    // Polling periodico ogni 1.5 secondi per garantire sincronizzazione ultra-robusta e supporto offline
    const interval = setInterval(() => {
      fetchRoomState();
    }, 1500);

    // Event listener per quando il dispositivo torna online / riaccende lo schermo
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRoomState();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', fetchRoomState);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', fetchRoomState);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [roomCode, fetchRoomState]);

  // Azione: invio voto partecipante
  const submitVote = async (dimensionIndex: number): Promise<boolean> => {
    if (!roomCode || !playerSession) return false;
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

      if (!res.ok) return false;

      const data = await res.json();
      if (data.success && data.room) {
        setRoom(data.room);

        // Salva il voto su localStorage del singolo dispositivo per resilienza caduta connessione
        const currentSaved = getSavedPlayerSession() || playerSession;
        currentSaved.savedVotes = {
          ...currentSaved.savedVotes,
          [data.room.currentRound]: dimensionIndex,
        };
        savePlayerSession(currentSaved);

        return true;
      }
      return false;
    } catch (e) {
      console.error('Errore invio voto:', e);
      return false;
    }
  };

  // Azione Host: attribuzione correttezza e calcolo punteggi
  const submitScores = async (correctness: Record<number, CorrectnessScore>): Promise<boolean> => {
    if (!roomCode || !room) return false;
    try {
      const res = await fetch(`/api/rooms/${roomCode}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundNumber: room.currentRound,
          correctness,
        }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.success && data.room) {
        setRoom(data.room);
        saveHostSession(data.room);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Errore invio punteggi:', e);
      return false;
    }
  };

  // Azione Host: avanza alla prossima domanda
  const nextQuestion = async (nextQuestionText: string): Promise<boolean> => {
    if (!roomCode) return false;
    try {
      const res = await fetch(`/api/rooms/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nextQuestion: nextQuestionText,
        }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.success && data.room) {
        setRoom(data.room);
        saveHostSession(data.room);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Errore passaggio alla prossima domanda:', e);
      return false;
    }
  };

  // Azione Host: cambia stato domanda o testo
  const updateRoomStatus = async (status: 'voting' | 'scored' | 'finished'): Promise<boolean> => {
    if (!roomCode) return false;
    try {
      const res = await fetch(`/api/rooms/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.success && data.room) {
        setRoom(data.room);
        saveHostSession(data.room);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Errore aggiornamento stato stanza:', e);
      return false;
    }
  };

  return {
    room,
    loading,
    error,
    isOnline,
    refreshRoom: fetchRoomState,
    submitVote,
    submitScores,
    nextQuestion,
    updateRoomStatus,
  };
}
