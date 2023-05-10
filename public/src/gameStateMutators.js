export function initialGameState(nrOfPlayers, maxY, maxX, competitors, simulationSpeed) {
    //start positions
    let startPositions = [];
    for (let i = 0; i < nrOfPlayers; i++) {
        let x = Math.floor(Math.random() * maxX) + 1;
        let y = Math.floor(Math.random() * maxY) + 1;
        if (startPositions.includes(x * 1000 + y)) i--;
        else startPositions[i] = x * 1000 + y;
    }
    //players
    let players = Object.values(competitors).map((value, _) => value);

    //gameboard
    let gameBoard = [];
    for (let x = 0; x < maxX; x++) {
        gameBoard[x] = [];
        for (let y = 0; y < maxY; y++) {
            gameBoard[x][y] = 0;
            if (x == 0 || x == maxX + 1 || y == 0 || y == maxY + 1)
                gameBoard[x][y] = -1;
        }
    }

    let playerState = [];
    let playerIsAlive = [];

    for (let i = 0; i < nrOfPlayers; i++) {
        let y = startPositions[i] % 1000;
        let x = Math.round((startPositions[i] - y) / 1000);

        playerState[i] = { x: x, y: y, dx: 0, dy: -1, activePower: { name: null, step: 0 } };
        playerIsAlive[i] = true;

        gameBoard[x][y] = i + 2; // the player number stored in the gameboard
    }

    return {
        step: 0,
        maxX: maxX,
        maxY: maxY,
        timer: 100,
        simulationSpeed: simulationSpeed,
        gameBoard: gameBoard,
        players: players,
        playerState: playerState,
        playerIsAlive: playerIsAlive,
        nrOfPlayers: nrOfPlayers,
        gameOver: false,
        boardPowerUp: null
    }
}

export function setSimulationSpeed(gameState, value) {
    return {
        ...gameState,
        simulationSpeed: value
    }
}

export function setNumberOfPlayers(gameState, num) {
    return {
        ...gameState,
        nrOfPlayers: num
    }
}