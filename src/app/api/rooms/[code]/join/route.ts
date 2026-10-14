import { NextResponse } from 'next/server';
import { getRoom, joinParticipant } from '@/lib/serverStore';
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
