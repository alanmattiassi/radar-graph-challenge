import { NextResponse } from 'next/server';
import { createRoom } from '@/lib/serverStore';

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
    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Errore creazione stanza:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
