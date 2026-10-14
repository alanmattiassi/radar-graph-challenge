import { RoomState, Participant, CorrectnessScore } from '@/types/game';

// Store in memoria per serverless / dev mode
const globalRooms = global as unknown as { __radar_rooms?: Map<string, RoomState> };
if (!globalRooms.__radar_rooms) {
  globalRooms.__radar_rooms = new Map<string, RoomState>();
}

export const roomsStore = globalRooms.__radar_rooms;

export function getRoom(code: string): RoomState | undefined {
  return roomsStore.get(code.toUpperCase());
}

export function saveRoom(room: RoomState): void {
  roomsStore.set(room.code.toUpperCase(), {
    ...room,
    updatedAt: Date.now(),
  });
}

export function createRoom(
  code: string,
  numDimensions: number,
  dimensionNames: string[],
  firstQuestion: string = 'Domanda 1',
  cumulativeMode: boolean = true
): RoomState {
  const newRoom: RoomState = {
    id: `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    code: code.toUpperCase(),
    numDimensions,
    dimensions: dimensionNames,
    currentQuestion: firstQuestion,
    currentRound: 1,
    status: 'voting',
    participants: {},
    round: {
      roundNumber: 1,
      questionText: firstQuestion,
      status: 'voting',
      votes: {},
      correctness: {},
    },
    roundHistory: [],
    cumulativeMode: cumulativeMode, // Attivo di default come richiesto
    updatedAt: Date.now(),
  };

  saveRoom(newRoom);
  return newRoom;
}

export function joinParticipant(
  roomCode: string,
  participant: Participant
): RoomState | null {
  const room = getRoom(roomCode);
  if (!room) return null;

  const existing = room.participants[participant.id];
  room.participants[participant.id] = {
    ...participant,
    totalScore: existing ? existing.totalScore : (participant.totalScore || 0),
    lastSeen: new Date().toISOString(),
  };

  saveRoom(room);
  return room;
}

export function recordVote(
  roomCode: string,
  roundNumber: number,
  participantId: string,
  playerCode: string,
  nickname: string,
  dimensionIndex: number
): RoomState | null {
  const room = getRoom(roomCode);
  if (!room) return null;

  if (room.currentRound === roundNumber && (room.status === 'voting' || room.round.status === 'voting')) {
    room.round.votes[participantId] = {
      participantId,
      playerCode,
      nickname,
      dimensionIndex,
    };
    saveRoom(room);
  }

  return room;
}

export function setRoundCorrectness(
  roomCode: string,
  roundNumber: number,
  correctnessMap: Record<number, CorrectnessScore>
): RoomState | null {
  const room = getRoom(roomCode);
  if (!room) return null;

  room.round.correctness = correctnessMap;
  room.round.status = 'scored';
  room.status = 'scored';

  Object.values(room.round.votes).forEach((vote) => {
    const score = correctnessMap[vote.dimensionIndex] ?? 0;
    vote.scoreAwarded = score;

    if (room.participants[vote.participantId]) {
      const p = room.participants[vote.participantId];
      p.totalScore = Number(((p.totalScore || 0) + score).toFixed(1));
      p.lastRoundScore = score;
    }
  });

  saveRoom(room);
  return room;
}

export function nextRound(
  roomCode: string,
  nextQuestionText: string
): RoomState | null {
  const room = getRoom(roomCode);
  if (!room) return null;

  if (!room.roundHistory) {
    room.roundHistory = [];
  }
  // Archivia il round attuale nello storico prima di iniziare il successivo
  if (room.round) {
    room.roundHistory.push({
      roundNumber: room.round.roundNumber,
      questionText: room.round.questionText,
      status: room.round.status,
      votes: { ...room.round.votes },
      correctness: { ...room.round.correctness },
    });
  }

  const nextRoundNum = room.currentRound + 1;
  room.currentRound = nextRoundNum;
  room.currentQuestion = nextQuestionText;
  room.status = 'voting';

  room.round = {
    roundNumber: nextRoundNum,
    questionText: nextQuestionText,
    status: 'voting',
    votes: {},
    correctness: {},
  };

  saveRoom(room);
  return room;
}
