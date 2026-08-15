export type DeliveryRushDirection = -1 | 1;

export interface DeliveryRushMoveInput {
  tick: number;
  action: "move";
  direction: DeliveryRushDirection;
}

export interface DeliveryRushJumpInput {
  tick: number;
  action: "jump";
}

export type DeliveryRushInput = DeliveryRushMoveInput | DeliveryRushJumpInput;

export interface DeliveryRushSimulationResult {
  score: number;
  distance: number;
  avoidedObstacles: number;
  collisionCount: number;
  maxCombo: number;
}

export interface StartDeliveryRushRunResponse {
  runId: number;
  seed: number;
  gameVersion: string;
  durationSeconds: number;
  tickRate: number;
  startedAtUtc: string;
  expiresAtUtc: string;
}

export interface FinishDeliveryRushRunRequest {
  inputs: DeliveryRushInput[];
}

export interface DeliveryRushRunResult {
  runId: number;
  score: number;
  distance: number;
  avoidedObstacles: number;
  collisionCount: number;
  maxCombo: number;
  isPersonalBest: boolean;
  weeklyRank: number | null;
  finishedAtUtc: string;
}

export interface DeliveryRushLeaderboardEntry {
  rank: number;
  playerName: string;
  score: number;
  distance: number;
  avoidedObstacles: number;
  collisionCount: number;
  maxCombo: number;
  isCurrentUser: boolean;
  achievedAtUtc: string;
}

export interface DeliveryRushLeaderboard {
  weekStartDate: string;
  weekEndDate: string;
  entries: DeliveryRushLeaderboardEntry[];
}

export interface DeliveryRushLiveStats extends DeliveryRushSimulationResult {
  currentCombo: number;
}
