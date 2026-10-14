import { NextResponse } from 'next/server';
import { getRoom, recordVote } from '@/lib/serverStore';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase();
    const body = await req.json();
    const { roundNumber, participantId, playerCode, nickname, dimensionIndex } = body;

    if (
      roundNumber === undefined ||
      !participantId ||
      !playerCode ||
      dimensionIndex === undefined
    ) {
      return NextResponse.json(
        { error: 'Parametri del voto incompleti' },
        { status: 400 }
      );
    }

    const room = getRoom(roomCode);
    if (!room) {
      return NextResponse.json({ error: 'Stanza non trovata' }, { status: 404 });
    }

    if (dimensionIndex < 0 || dimensionIndex >= room.numDimensions) {
      return NextResponse.json(
        { error: 'Indice dimensione non valido' },
        { status: 400 }
      );
    }

    const updatedRoom = recordVote(
      roomCode,
      roundNumber,
      participantId,
      playerCode,
      nickname || playerCode,
      dimensionIndex
    );

    return NextResponse.json({
      success: true,
      room: updatedRoom,
      vote: {
        roundNumber,
        participantId,
        dimensionIndex,
      },
    });
  } catch (error) {
    console.error('Errore registrazione voto:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
