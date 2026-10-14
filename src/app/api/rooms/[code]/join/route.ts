import { NextResponse } from 'next/server';
import { getRoom, joinParticipant } from '@/lib/serverStore';
import { getSupabaseClient } from '@/lib/supabase';
import { Participant } from '@/types/game';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase();
    const body = await req.json();
    const { playerId, playerCode, nickname } = body;

    if (!playerId || !playerCode) {
      return NextResponse.json(
        { error: 'Dati partecipante mancanti (playerId o playerCode)' },
        { status: 400 }
      );
    }

    const room = getRoom(roomCode);
    if (!room) {
      return NextResponse.json({ error: 'Stanza non trovata' }, { status: 404 });
    }

    const participant: Participant = {
      id: playerId,
      roomCode,
      playerCode,
      nickname: nickname || playerCode,
      totalScore: 0,
    };

    const updatedRoom = joinParticipant(roomCode, participant);

    // Sync Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('participants').upsert(
          {
            id: participant.id,
            room_code: roomCode,
            player_code: participant.playerCode,
            nickname: participant.nickname,
            total_score: participant.totalScore,
            last_seen: new Date().toISOString(),
          },
          { onConflict: 'room_code, player_code' }
        );
      } catch (e) {
        console.warn('Sync Supabase join non riuscito:', e);
      }
    }

    return NextResponse.json({
      success: true,
      room: updatedRoom,
      participant: updatedRoom?.participants[playerId],
    });
  } catch (error) {
    console.error('Errore join participant:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
