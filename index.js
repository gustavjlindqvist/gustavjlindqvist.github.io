const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const gameClientServer = new Server(server);

const { bots } = require('./bots');

var timer;
var gameCanvasSocket;

const gameClientsNameSpace = gameClientServer.of("/gameClient");

const allPowerups = [
    {
        name: "frozen",
        id: 100,
        color: "#FFFFFF"
    }
];

//initialize x number of players

class GameState {
    constructor(maxX, maxY, simulationSpeed) {
        let gameBoard = [];
        for (let x = 0; x <= maxX + 1; x++) {
            gameBoard[x] = [];
            for (let y = 0; y <= maxY + 1; y++) {
                gameBoard[x][y] = 0;
                if (x == 0 || x == maxX + 1 || y == 0 || y == maxY + 1)
                    gameBoard[x][y] = -1;
            }
        }

        this.numberOfPlayers = 2
        this.step = 0
        this.availableColors = ["#d39", "#3d9", "#d93", "#39d", "#93d", "#9d3", "#7ff", "#f5f", "#7ff", "#ff7"]
        this.simulationSpeed = simulationSpeed
        this.gameBoard = gameBoard
        this.maxX = maxX
        this.maxY = maxY
        this.selectablePlayers = []
        this.activePlayers = []
        this.gameOver = false
        this.boardPowerUp = null
        this.messageBuffer = []
    }

    addSelectableBots(bots) {
        const botsWithColor = bots.map((bot) => {
            const botColor = this.availableColors.pop()
            bot.color = botColor
            return bot
        })

        this.selectablePlayers = this.selectablePlayers.concat(botsWithColor)

        return this
    }

    setNumberOfPlayers(number) {
        this.numberOfPlayers = number
        return this
    }

    addSelectablePlayer(name) {
        const playerColor = this.availableColors.pop()

        this.selectablePlayers.push({
            name: name,
            color: playerColor
        })

        return this
    }

    addActivePowerToPlayer(id, power) {
        const player = this.activePlayers.find(player => player.id == id)

        player.activePower = power

        return this
    }

    addActivePlayer(name) {
        const player = this.selectablePlayers.find(player => player.name == name)

        if (player != null) {
            let x = Math.floor(Math.random() * this.maxX) + 1;
            let y = Math.floor(Math.random() * this.maxY) + 1;

            const newActivePlayer = {
                name: name,
                func: player.func != null ? player.func : null,
                id: this.activePlayers.length + 1,
                x: x,
                y: y,
                dx: 0,
                dy: -1,
                activePower: null,
                isAlive: true
            }

            this.gameBoard[x][y] = newActivePlayer.id
            this.activePlayers.push(newActivePlayer)
        }

        return this
    }

    randomDirection() {
        const directions = [-1, 0, 1]
        return directions[Math.floor(Math.random() * directions.length)]
    }

    isFrozen(playerState) {
        return playerState.activePower != null ? playerState.activePower.name == "frozen" : false
    }

    squareNotEmpty(x, y) {
        return this.gameBoard[x][y] != 0
    }

    playersNameInColor(activePlayer) {
        return "<span style='color: " + activePlayer.color + "'>" + activePlayer.name + "</span>";
    }

    handlePowerUpExpiry(activePlayer) {
        if (this.isFrozen(activePlayer)) {
            const stepsSinceActive = this.step - activePlayer.activePower.step
            if (stepsSinceActive > 20) {
                activePlayer.activePower = null
            }
        }
    }

    isValidMove(activePlayer, playerMove) {
        const dx = playerMove.dx
        const dy = playerMove.dy

        if (dx == -1 && dy == 0 ||
            dx == 1 && dy == 0 ||
            dx == 0 && dy == 1 ||
            dx == 0 && dy == -1) {
            return true
        }

        if (activePlayer.activePower.name == "diagonal") {
            if (dx == -1 && dy == -1 ||
                dx == 1 && dy == -1 ||
                dx == -1 && dy == 1 ||
                dx == 1 && dy == 1) {
                return true
            }
        }

        return false
    }

    handlePlayerMove(activePlayer, playerMoves) {
        const playerMove = playerMoves.find(move => move.name == activePlayer.name)

        if (playerMove == null) {
            activePlayer.x += activePlayer.dx
            activePlayer.y += activePlayer.dy
            return
        }

        activePlayer.dx = playerMove.dx
        activePlayer.dy = playerMove.dy

        if (activePlayer.isAlive && !this.isFrozen(activePlayer)) {
            if (this.isValidMove(activePlayer, playerMove)) {
                activePlayer.x += activePlayer.dx;
                activePlayer.y += activePlayer.dy;
            } else {
                activePlayer.isAlive = false
                this.messageBuffer.push(playersNameInColor(activePlayer) + " gave an invalid move ☠️")
            }
        }
    }

    checkForDeathAfterMove(activePlayer, otherPlayers) {
        const playerX = activePlayer.x;
        const playerY = activePlayer.y;

        if (activePlayer.isAlive && !this.isFrozen(activePlayer)) {
            // Player hits wall or snake (they die)
            if (this.squareNotEmpty(playerX, playerY)) {
                if (this.gameBoard[playerX][playerY] == -1) {
                    this.messageBuffer.push(playersNameInColor(activePlayer) + " crashed into the edge ☠️");
                } else if (this.gameBoard[playerX][playerY] == activePlayer.id) {
                    this.messageBuffer.push(playersNameInColor(activePlayer) + " crashed into itself ☠️");
                } else {
                    const otherPlayerId = this.gameBoard[playerX][playerY];
                    const otherPlayer = otherPlayers.find(player => player.id == otherPlayerId)
                    this.messageBuffer.push(playersNameInColor(activePlayer) + " crashed into " + playersNameInColor(otherPlayer) + " ☠️");
                }
                activePlayer.isAlive = false;
            }
            else {
                // Player hits another players head (both die)
                for (const otherPlayer of otherPlayers) {
                    if (playerX == otherPlayer.x && playerY == otherPlayer.y) {
                        this.messageBuffer.push(playersNameInColor(activePlayer) + " and " + playersNameInColor(otherPlayer) + " crashed into each other ☠️");
                        activePlayer.isAlive = false
                        otherPlayer.isAlive = false
                    }

                }
            }
        }
    }

    checkForWinners(playersAliveBeforeMoves) {
        const playersAliveAfterMoves = this.activePlayers.filter(player => player.isAlive)

        //If one player is still alive
        if (playersAliveAfterMoves.length == 1 && playersAliveBeforeMoves.length > 1) {
            return playersAliveAfterMoves
        }

        // If no players still alive
        if (playersAliveAfterMoves.length == 0) {
            // If there was more than one player alive before, but now zero players alive, it's a draw.
            if (playersAliveBeforeMoves.length > 1) {
                return playersAliveBeforeMoves
                //this.messageBuffer.push(output);
            }
        }

        return []
    }

    addWinnersToMessageBuffer(winners) {
        if (winners.length == 1) {
            const output = playersNameInColor(winners[0]) + " wins 🏁"
            this.messageBuffer.push(output)
        }

        if (winners.length > 1) {
            const output = winners.reduce((output, player) => {
                output + playersNameInColor(player)
            }, "It's a draw between ") + " 🏁"

            this.messageBuffer.push(output)
        }
    }

    updateGameboard(activePlayer) {
        // Update game board with new player head
        if (playerIsAlive[i] && !isFrozen(playerState[i])) {
            let x = playerState[i].x;
            let y = playerState[i].y;
            gameBoard[x][y] = i + 2;
        }
    }

    gameStep(playerMoves) {
        // Save copy for later
        let messages = []

        //let lastPlayerState = JSON.parse(JSON.stringify(this.playerState));
        const playersAliveBeforeMoves = this.activePlayers.filter(player => player.isAlive)

        // Check for powerup expiry
        for (const activePlayer of this.activePlayers) {
            this.handlePowerUpExpiry(activePlayer)
            this.handlePlayerMove(activePlayer, playerMoves)
        }

        for (const activePlayer of this.activePlayers) {
            const otherPlayers = this.activePlayers.filter(player => player != activePlayer)
            this.checkForDeathAfterMove(activePlayer, otherPlayers)
        }

        const winners = this.checkForWinners(playersAliveBeforeMoves)

        if (winners.length > 0) {
            this.addWinnersToMessageBuffer(winners)
            this.gameOver = true

            return this
        }

        for (const activePlayer of this.activePlayers) {
            this.updateGameboard(activePlayer)
        }

        // // Check if any player finds a powerup
        // for (let i = 0; i < nrOfPlayers; i++) {
        //     const playerX = playerState[i].x;
        //     const playerY = playerState[i].y;

        //     if (boardPowerUp) {
        //         if (boardPowerUp.x == playerX && boardPowerUp.y == playerY) {
        //             messages.push(playersNameInColor(players[i]) + " is " + boardPowerUp.name + " 🧊");

        //             playerState[i].activePower = { name: boardPowerUp.name, step: step };
        //             boardPowerUp = null;
        //         }
        //     }
        // }

        // // Add powerup to board if needed
        // const powerUpChance = Math.floor(Math.random() * 20);
        // if (!boardPowerUp && powerUpChance == 0) {
        //     let iteration = 10;
        //     let powerX = -1;
        //     let powerY = -1;
        //     do {
        //         powerX = Math.round(Math.random() * maxX);
        //         powerY = Math.round(Math.random() * maxY);
        //         iteration -= 1;

        //     } while (squareNotEmpty(gameBoard, powerX, powerY) && iteration > 0);

        //     if (iteration > 0) {
        //         const chosenPower = allPowerups[0];
        //         boardPowerUp = { name: chosenPower.name, id: chosenPower.id, x: powerX, y: powerY };
        //     }
        // }

        // return {
        //     step: step + 1,
        //     simulationSpeed: simulationSpeed,
        //     gameBoard: gameBoard,
        //     maxX: maxX,
        //     maxY: maxY,
        //     selectablePlayers: selectablePlayers,
        //     activePlayers: activePlayers,
        //     players: players,
        //     playerState: playerState,
        //     playerIsAlive: playerIsAlive,
        //     nrOfPlayers: nrOfPlayers,
        //     gameOver: false,
        //     boardPowerUp: boardPowerUp,
        //     messageBuffer: messages
        // }
    }

    clone() {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }
}

const gameState = new GameState(40, 40, 100).addSelectableBots(bots).addActivePlayer("Always right").addSelectablePlayer("Timas").addActivePlayer("Timas") //.addActivePowerToPlayer(1, { name: "frozen", step: 0 })

console.log(gameState.activePlayers)

gameState.gameStep([{ name: 'Always right', dx: 1, dy: 0 }])

console.log(gameState.activePlayers)

function createInitialGameState(nrOfPlayers, maxX, maxY, simulationSpeed, bots) {
    const availableColors = ["#d39", "#3d9", "#d93", "#39d", "#93d", "#9d3"];

    //start positions
    let startPositions = [];
    for (let i = 0; i < nrOfPlayers; i++) {
        let x = Math.floor(Math.random() * maxX) + 1;
        let y = Math.floor(Math.random() * maxY) + 1;
        if (startPositions.includes(x * 1000 + y)) i--;
        else startPositions[i] = x * 1000 + y;
    }

    //players
    let players = Object.values(bots).map((value, _) => value)

    //gameboard
    let gameBoard = [];
    for (let x = 0; x <= maxX + 1; x++) {
        gameBoard[x] = [];
        for (let y = 0; y <= maxY + 1; y++) {
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
        simulationSpeed: simulationSpeed,
        gameBoard: gameBoard,
        maxX: maxX,
        maxY: maxY,
        selectablePlayers: players,
        activePlayers: [],
        players: players,
        playerState: playerState,
        playerIsAlive: playerIsAlive,
        nrOfPlayers: nrOfPlayers,
        gameOver: false,
        boardPowerUp: null,
        messageBuffer: []
    }
}

function startGame(initialGameState) {
    //gameState.messages.push("And the snakes are off... ");
    console.log("started game");
    clearTimeout(timer);
    gameLoop()
}

function getClientState(gameState) {
    // Ask clients for their move {dx: _, dy: _}
    for (let i = 0; i < gameState.nrOfPlayers; i++) {
        var gameBoardCopy = getGameBoardCopy(gameState.gameBoard, gameState.maxX, gameState.maxY, i);

        var playerStateCopy = JSON.parse(JSON.stringify(gameState.playerState));
        var otherPlayersState = {};
        var myState;
        for (let p = 0; p < gameState.nrOfPlayers; p++) {
            if (p == i) {
                myState = playerStateCopy[p];
            } else {
                let playerNr = p + 2;
                otherPlayersState[playerNr] = playerStateCopy[p];
            }
        }
    }

    return {
        "gameBoard": gameBoardCopy,
        "myState": myState,
        "otherPlayersState": playerStateCopy,
        "boardPowerUp": gameState.boardPowerUp
    }
}

async function getPlayerMoves() {
    const clientState = getClientState(currentGameState);

    try {
        const responses = await gameClientsNameSpace.timeout(1000).emitWithAck('clientMove', clientState);

        return responses
    } catch (e) {
        // some clients did not acknowledge the event in the given delay, try again
        return []
    }
}

async function gameLoop(currentGameState) {
    const playerMoves = []//await getPlayerMoves()
    //const lastGameState = JSON.parse(JSON.stringify(currentGameState));
    const nextGameState = gameStep(currentGameState, playerMoves);

    if (nextGameState.messageBuffer.length != 0) {
        console.log(nextGameState.messageBuffer)
    }

    if (gameCanvasSocket != null) {
        gameCanvasSocket.emit('updatedGameState', lastGameState, currentGameState);
    }

    if (currentGameState.gameOver) {
        return
    }

    timer = setTimeout(function () {
        gameLoop()
    }, currentGameState.simulationSpeed);
}

function addNewSelectablePlayerToGame(playerName) {
    currentGameState.selectablePlayers.push({
        name: playerName,
        color: '#f60'
    })

    if (gameCanvasSocket != null) {
        gameCanvasSocket.emit('playerJoined', currentGameState);
    }
}

function getGameBoardCopy(gameBoard, maxX, maxY, player) {
    let gameBoardCopy = JSON.parse(JSON.stringify(gameBoard));
    let playerNr = player + 2;
    for (let x = 1; x <= maxX; x++) {
        for (let y = 1; y <= maxY; y++) {
            if (gameBoardCopy[x][y] == playerNr) {
                gameBoardCopy[x][y] = 1;
            }
        }
    }
    return gameBoardCopy;
}

function gameStep({
    step,
    simulationSpeed,
    gameBoard,
    maxX,
    maxY,
    players,
    selectablePlayers,
    activePlayers,
    playerState,
    playerIsAlive,
    nrOfPlayers,
    gameOver,
    boardPowerUp }, playerMoves) {
    // Save copy for later
    let messages = []

    let lastPlayerState = JSON.parse(JSON.stringify(playerState));

    let playersAliveAtBeginningOfStep = [];
    for (let i = 0; i < nrOfPlayers; i++) {
        if (playerIsAlive[i]) {
            playersAliveAtBeginningOfStep.push(i);
        }
    }

    // Check for powerup expiry
    for (let i = 0; i < nrOfPlayers; i++) {
        if (isFrozen(playerState[i])) {
            const stepsSinceActive = step - (playerState[i].activePower.step)
            if (stepsSinceActive > 20) {
                playerState[i].activePower = { name: null, step: step }
            }
        }
    }

    // Ask clients for their move {dx: _, dy: _}
    for (let i = 0; i < nrOfPlayers; i++) {

        if (playerIsAlive[i] && !isFrozen(playerState[i])) {

            let gameBoardCopy = getGameBoardCopy(gameBoard, maxX, maxY, i);

            let playerStateCopy = JSON.parse(JSON.stringify(playerState));
            let otherPlayersState = {};
            let myState;
            for (let p = 0; p < nrOfPlayers; p++) {
                if (p == i) {
                    myState = playerStateCopy[p];
                } else {
                    let playerNr = p + 2;
                    otherPlayersState[playerNr] = playerStateCopy[p];
                }
            }

            let move = players[i].func(myState, playerStateCopy, gameBoardCopy, boardPowerUp);
            playerState[i].dx = move.dx;
            playerState[i].dy = move.dy;
        }
    }

    // Move players according to their selected move.
    for (let i = 0; i < nrOfPlayers; i++) {
        if (playerIsAlive[i] && !isFrozen(playerState[i])) {
            let validMove = false;
            let dx = playerState[i].dx;
            let dy = playerState[i].dy;

            if (dx == -1 && dy == 0 ||
                dx == 1 && dy == 0 ||
                dx == 0 && dy == 1 ||
                dx == 0 && dy == -1) {
                validMove = true;
            }

            if (playerState[i].activePower.name == "diagonal") {
                if (dx == -1 && dy == -1 ||
                    dx == 1 && dy == -1 ||
                    dx == -1 && dy == 1 ||
                    dx == 1 && dy == 1) {
                    validMove = true;
                }
            }

            if (validMove) {
                playerState[i].x += dx;
                playerState[i].y += dy;
            } else {
                messages.push(playersNameInColor(players[i]) + " gave an invalid move ☠️");
                playerIsAlive[i] = false;
            }
        }
    }

    // Check if player gets killed
    for (let i = 0; i < nrOfPlayers; i++) {
        const playerX = playerState[i].x;
        const playerY = playerState[i].y;

        if (playerIsAlive[i] && !isFrozen(playerState[i])) {
            // Player hits wall or snake (they die)
            if (squareNotEmpty(gameBoard, playerX, playerY)) {
                if (gameBoard[playerX][playerY] == -1) {
                    messages.push(playersNameInColor(players[i]) + " crashed into the edge ☠️");
                } else if (gameBoard[playerX][playerY] == (i + 2)) {
                    messages.push(playersNameInColor(players[i]) + " crashed into itself ☠️");
                } else {
                    const otherSnakeIndex = gameBoard[playerX][playerY] - 2;
                    messages.push(playersNameInColor(players[i]) + " crashed into " + playersNameInColor(players[otherSnakeIndex]) + " ☠️");
                }
                playerIsAlive[i] = false;
            }
            else {
                // Player hits another players head (both die)
                for (let j = i + 1; j < nrOfPlayers; j++) {
                    if (playerX == playerState[j].x && playerY == playerState[j].y) {
                        messages.push(playersNameInColor(players[i]) + " and " + playersNameInColor(players[j]) + " crashed into each other ☠️");
                        playerIsAlive[i] = false;
                        playerIsAlive[j] = false;
                    }
                }
            }
        }
    }

    // Check for a winner
    if (playerIsAlive.includes(false)) {
        let nrOfPlayersAlive = 0;
        let winner = 0;
        for (let i = 0; i < nrOfPlayers; i++) {
            if (playerIsAlive[i]) {
                nrOfPlayersAlive++;
                winner = i;
            }
        }

        if (nrOfPlayersAlive == 1) {
            if (playersAliveAtBeginningOfStep.length > 1) {
                let output = playersNameInColor(players[winner]) + " wins 🏁";
                messages.push(output);
            }
        }

        // Check for end of game when no players alive
        if (nrOfPlayersAlive == 0) {
            // If there was more than one player alive before, but now zero players alive, it's a draw.
            if (playersAliveAtBeginningOfStep.length > 1) {
                let output = "It's a draw between ";
                for (let drawPlayerIndex = 0; drawPlayerIndex < playersAliveAtBeginningOfStep.length; drawPlayerIndex++) {
                    output = output + playersNameInColor(players[drawPlayerIndex]);
                    if (drawPlayerIndex < playersAliveAtBeginningOfStep.length - 2) {
                        output = output + ", ";
                    } else if (drawPlayerIndex == playersAliveAtBeginningOfStep.length - 2) {
                        output = output + " and ";
                    } else {
                        output = output + " 🏁";
                    }
                }
                messages.push(output);
            }

            return {
                step: step + 1,
                simulationSpeed: simulationSpeed,
                gameBoard: gameBoard,
                maxX: maxX,
                maxY: maxY,
                selectablePlayers: selectablePlayers,
                activePlayers: activePlayers,
                players: players,
                playerState: playerState,
                playerIsAlive: playerIsAlive,
                nrOfPlayers: nrOfPlayers,
                gameOver: true,
                boardPowerUp: null,
                messageBuffer: messages
            }
        }
    }

    // Update game board with new player head
    for (let i = 0; i < nrOfPlayers; i++) {
        if (playerIsAlive[i] && !isFrozen(playerState[i])) {
            let x = playerState[i].x;
            let y = playerState[i].y;
            gameBoard[x][y] = i + 2;
        }
    }

    // Check if any player finds a powerup
    for (let i = 0; i < nrOfPlayers; i++) {
        const playerX = playerState[i].x;
        const playerY = playerState[i].y;

        if (boardPowerUp) {
            if (boardPowerUp.x == playerX && boardPowerUp.y == playerY) {
                messages.push(playersNameInColor(players[i]) + " is " + boardPowerUp.name + " 🧊");

                playerState[i].activePower = { name: boardPowerUp.name, step: step };
                boardPowerUp = null;
            }
        }
    }

    // Add powerup to board if needed
    const powerUpChance = Math.floor(Math.random() * 20);
    if (!boardPowerUp && powerUpChance == 0) {
        let iteration = 10;
        let powerX = -1;
        let powerY = -1;
        do {
            powerX = Math.round(Math.random() * maxX);
            powerY = Math.round(Math.random() * maxY);
            iteration -= 1;

        } while (squareNotEmpty(gameBoard, powerX, powerY) && iteration > 0);

        if (iteration > 0) {
            const chosenPower = allPowerups[0];
            boardPowerUp = { name: chosenPower.name, id: chosenPower.id, x: powerX, y: powerY };
        }
    }

    return {
        step: step + 1,
        simulationSpeed: simulationSpeed,
        gameBoard: gameBoard,
        maxX: maxX,
        maxY: maxY,
        selectablePlayers: selectablePlayers,
        activePlayers: activePlayers,
        players: players,
        playerState: playerState,
        playerIsAlive: playerIsAlive,
        nrOfPlayers: nrOfPlayers,
        gameOver: false,
        boardPowerUp: boardPowerUp,
        messageBuffer: messages
    }
}

function isFrozen(playerState) {
    //return playerState.activePower.name == "frozen"
}

function squareNotEmpty(gameBoard, x, y) {
    return gameBoard[x][y] != 0
}

function playersNameInColor(player) {
    return "<span style='color: " + player.color + "'>" + player.name + "</span>";
}

let currentGameState = new GameState(40, 40, 10) //createInitialGameState(2, 40, 40, 10, bots);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

gameClientServer.on('connection', (socket) => {
    gameCanvasSocket = socket
    console.log('game connected');

    socket.emit('renderInitialGameState', currentGameState);

    socket.on('startGame', () => {
        startGame();
        console.log('start game')
    })

    socket.on('resetGame', () => {
        clearTimeout(timer);
        currentGameState = createInitialGameState(currentGameState.nrOfPlayers, currentGameState.maxX, currentGameState.maxY, currentGameState.simulationSpeed, bots);

        socket.emit('didResetGame', currentGameState);
    })

    socket.on('setNumberOfPlayers', (numberOfPlayers) => {
        currentGameState = createInitialGameState(numberOfPlayers, currentGameState.maxX, currentGameState.maxY, currentGameState.simulationSpeed, bots);
        socket.emit('didChangeNumberOfPlayers', currentGameState);
    })

    socket.on('setSimulationSpeed', (speed) => {
        currentGameState.simulationSpeed = 1000 / speed;
    })

    socket.on('gameSpeedSelector', (data) => {
        console.log('select game speed')
    })

    socket.on('disconnect', () => {
        console.log('game disconnected');
    })
});

gameClientsNameSpace.on("connection", (socket) => {
    socket.on('playerJoined', input => {
        if (input[0].name !== null) {
            const playerName = input[0].name

            addNewPlayerToGame(playerName)
        }
    })
});


// server.listen(3000, () => {
//     console.log('listening on localhost:3000');
// });