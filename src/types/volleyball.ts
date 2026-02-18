export type Team = 'blue' | 'red';
export type PointType = 'scored' | 'fault';
export type ActionType = 'service' | 'attack' | 'block_out' | 'other';

export interface Point {
  id: string;
  team: Team;
  type: PointType;
  action: ActionType;
  x: number;
  y: number;
  timestamp: number;
}

export interface SetData {
  id: string;
  number: number;
  points: Point[];
  score: { blue: number; red: number };
  winner: Team | null;
  duration: number; // seconds
}

export interface MatchState {
  points: Point[];
  selectedTeam: Team | null;
  selectedPointType: PointType;
  selectedAction: ActionType;
}
