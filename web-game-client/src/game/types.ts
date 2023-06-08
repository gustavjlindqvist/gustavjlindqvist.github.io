interface PlayerState {
  name: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  isAlive: boolean;
  id: number;
}

type GameBoard = number[][];

interface GameState {
  gameBoard: GameBoard;
  playerStates: PlayerState[];
}

interface MoveLeft {
  dx: -1;
  dy: 0;
}

interface MoveRight {
  dx: 1;
  dy: 0;
}

interface MoveUp {
  dx: 0;
  dy: -1;
}

interface MoveDown {
  dx: 0;
  dy: 1;
}

type Move = MoveLeft | MoveRight | MoveUp | MoveDown;
