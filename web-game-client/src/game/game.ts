export function getPlayerId(gameState: GameState, name: string) {
  return gameState.playerStates.filter((player) => player.name === name)[0].id;
}

// TODO: Implement getPlayerMove
export function getPlayerMove(gameState: GameState, playerId: number): Move {
  return {
    dx: 1,
    dy: 0,
  };
}
