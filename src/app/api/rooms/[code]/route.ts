import { NextResponse } from 'next/server';
import { getRoom, saveRoom } from '@/lib/serverStore';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase();
    const room = getRoom(roomCode);

    if (!room) {
      // Tentativo di recupero da Supabase se non presente in memoria
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', roomCode)
          .single();

        if (data && !error) {
          // Ricostruzione stato stanza
          const loadedRoom = {
            id: data.id,
            code: data.code,
            numDimensions: data.num_dimensions,
            dimensions: data.dimensions,
            currentQuestion: data.current_question || '',
            currentRound: data.current_round || 1,
            status: data.status || 'lobby',
            participants: {},
            round: {
              roundNumber: data.current_round || 1,
              questionText: data.current_question || '',
              status: 'voting' as const,
              votes: {},
              correctness: {},
            },
            updatedAt: Date.now(),
          };
          saveRoom(loadedRoom);
          return NextResponse.json({ success: true, room: loadedRoom });
        }
      }

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

    // Sync Supabase se presente
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('rooms')
          .update({
            status: room.status,
            current_question: room.currentQuestion,
            current_round: room.currentRound,
            updated_at: new Date().toISOString(),
          })
          .eq('code', roomCode);
      } catch (e) {
        console.warn('Sync Supabase PATCH non riuscito:', e);
      }
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Errore PATCH room:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
