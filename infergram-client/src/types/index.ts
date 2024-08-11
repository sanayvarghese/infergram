export interface Player {
  id: string;
  name: string;
  score: number;
  color: string;
  isHost: boolean;
}

export interface RoundData {
  round: number;
  totalRounds: number;
  imageUrl: string;
  hiddenText: string;
}

export interface GuessResult {
  playerId: string;
  playerName: string;
  correct: boolean;
  scoreGain: number;
  hiddenWord: string;
}
