import { NextResponse } from 'next/server';
import { getRoom, setRoundCorrectness } from '@/lib/serverStore';
import { getSupabaseClient } from '@/lib/supabase';
import { CorrectnessScore } from '@/types/game';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase();
    const body = await req.json();
    const { roundNumber, correctness } = body;

    if (roundNumber === undefined || !correctness) {
      return NextResponse.json(
        { error: 'Parametri del calcolo punteggi incompleti' },
        { status: 400 }
      );
    }

    const room = getRoom(roomCode);
    if (!room) {
      return NextResponse.json({ error: 'Stanza non trovata' }, { status: 404 });
    }

    // correctness è una mappa dimensionIndex -> 0 | 0.5 | 1
    const correctnessMap: Record<number, CorrectnessScore> = {};
    for (let i = 0; i < room.numDimensions; i++) {
      const val = Number(correctness[i] ?? 0);
      if (val === 1 || val === 0.5 || val === 0) {
        correctnessMap[i] = val as CorrectnessScore;
      } else {
        correctnessMap[i] = 0;
      }
    }

    const updatedRoom = setRoundCorrectness(roomCode, roundNumber, correctnessMap);

    // Sync Supabase
    const supabase = getSupabaseClient();
    if (supabase && updatedRoom) {
      try {
        // 1. Salva round
        await supabase.from('rounds').upsert(
          {
            room_code: roomCode,
            round_number: roundNumber,
            question_text: updatedRoom.currentQuestion,
            status: 'scored',
            correctness_scores: correctnessMap,
          },
          { onConflict: 'room_code, round_number' }
        );

        // 2. Aggiorna punteggi dei partecipanti nel DB
        const participantsList = Object.values(updatedRoom.participants);
        for (const p of participantsList) {
          await supabase
            .from('participants')
            .update({ total_score: p.totalScore })
            .eq('id', p.id);
        }
      } catch (e) {
        console.warn('Sync Supabase score non riuscito:', e);
      }
    }

    return NextResponse.json({
      success: true,
      room: updatedRoom,
    });
  } catch (error) {
    console.error('Errore calcolo punteggi:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
