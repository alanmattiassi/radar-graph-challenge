import { NextResponse } from 'next/server';
import { getRoom, saveRoom } from '@/lib/serverStore';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase();
    const room = getRoom(roomCode);

    if (!room) {
      return NextResponse.json({ error: 'Stanza non trovata' }, { status: 404 });
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Errore GET room:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase();
    const room = getRoom(roomCode);

    if (!room) {
      return NextResponse.json({ error: 'Stanza non trovata' }, { status: 404 });
    }

    const body = await req.json();
    const { status, currentQuestion, nextQuestion } = body;

    if (nextQuestion) {
      room.currentRound += 1;
      room.currentQuestion = nextQuestion;
      room.status = 'voting';
      room.round = {
        roundNumber: room.currentRound,
        questionText: nextQuestion,
        status: 'voting',
        votes: {},
        correctness: {},
      };
    } else {
      if (status) room.status = status;
      if (currentQuestion !== undefined) {
        room.currentQuestion = currentQuestion;
        room.round.questionText = currentQuestion;
      }
    }

    saveRoom(room);
    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Errore PATCH room:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
