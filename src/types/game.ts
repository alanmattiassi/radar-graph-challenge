export type CorrectnessScore = 0 | 0.5 | 1;

export type GameStatus = 'lobby' | 'voting' | 'scored' | 'finished';

export interface Dimension {
  index: number;
  name: string;
  color?: string;
}

export interface Participant {
  id: string;
  roomCode: string;
  playerCode: string; // Codice alfanumerico univoco assegnato (es. P-7K2X)
  nickname: string;
  totalScore: number;
  lastRoundScore?: number;
  lastSeen?: string;
}

export interface VoteRecord {
  participantId: string;
  playerCode: string;
  nickname: string;
  dimensionIndex: number;
  scoreAwarded?: number;
}

export interface RoundState {
  roundNumber: number;
  questionText: string;
  status: 'voting' | 'scored';
  votes: Record<string, VoteRecord>; // participantId -> VoteRecord
  correctness: Record<number, CorrectnessScore>; // dimensionIndex -> score (0, 0.5, 1)
}

export interface RoomState {
  id: string;
  code: string;
  numDimensions: number;
  dimensions: string[];
  currentQuestion: string;
  currentRound: number;
  status: GameStatus;
  participants: Record<string, Participant>;
  round: RoundState;
  roundHistory?: RoundState[]; // Storico dei round precedenti per la modalità riempimento cumulativo
  cumulativeMode?: boolean; // Opzione attiva di default per sommare i voti tra round successivi
  updatedAt: number;
}

export interface PlayerSession {
  playerId: string;
  playerCode: string;
  nickname: string;
  roomCode: string;
  joinedAt: number;
  savedVotes: Record<number, number>; // roundNumber -> dimensionIndex
}
