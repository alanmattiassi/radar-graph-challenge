import { NextResponse } from 'next/server';
import { createRoom, getRoom, saveRoom } from '@/lib/serverStore';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, numDimensions, dimensions, firstQuestion } = body;

    if (!code || !numDimensions || !dimensions || dimensions.length < 3) {
      return NextResponse.json(
        { error: 'Parametri non validi. Minimo 3 dimensioni richieste.' },
        { status: 400 }
      );
    }

    const room = createRoom(code, numDimensions, dimensions, firstQuestion || 'Domanda 1');

    // Se Supabase è configurato, sincronizza anche sul DB
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('rooms').upsert({
          code: room.code,
          num_dimensions: room.numDimensions,
          dimensions: room.dimensions,
          current_question: room.currentQuestion,
          current_round: room.currentRound,
          status: room.status,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Sync Supabase non riuscito (fallback su store locale):', e);
      }
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Errore creazione stanza:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
