const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io")
const gameClientServer = new Server(server, {
    pingInterval: 1000,
    pingTimeout: 1000
});

const { bots } = require('./bots');
const { allPowerups } = require('./powerups');

var timer;
var gameCanvasSocket;

const gameClientsNameSpace = gameClientServer.of("/gameClient");
const playingRoom = "playingRoom"

class GameState {
    constructor(maxX, maxY, simulationSpeed) {
        this.step = 0
        this.availableColors = ["#d39", "#3d9", "#d93", "#39d", "#93d", "#9d3", "#7ff", "#f5f", "#7ff", "#ff7"]
        this.simulationSpeed = simulationSpeed
        this.gameBoard = this.initialGameBoard(maxX, maxY)
        this.maxX = maxX
        this.maxY = maxY
        this.selectablePlayers = []
        this.activePlayers = []
        this.boardPowerUp = null
        this.messageBuffer = []
        this.stopGameLoop = false
    }

    initialGameBoard(maxX, maxY) {
        let gameBoard = [];
        for (let x = 0; x <= maxX + 1; x++) {
            gameBoard[x] = [];
            for (let y = 0; y <= maxY + 1; y++) {
                gameBoard[x][y] = 0;
                if (x == 0 || x == maxX + 1 || y == 0 || y == maxY + 1)
                    gameBoard[x][y] = -1;
            }
        }

        return gameBoard
    }

    reset() {
        this.step = 0;
        this.gameBoard = this.initialGameBoard(this.maxX, this.maxY);
        this.boardPowerUp = null;
        this.messageBuffer = [];
        this.stopGameLoop = false;

        this.activePlayers.forEach(player => {

            let [x, y] = this.randomEmptyCoordinates();
            player.x = x;
            player.y = y;
            player.isAlive = true;
            player.dx = 0;
            player.dy = -1;
            player.activePower = null;

            // Update game board with player's starting position
            this.gameBoard[x][y] = player.id
        })
    }

    eraseTails() {
        this.gameBoard = this.initialGameBoard(this.maxX, this.maxY)

        for (const activePlayer of this.activePlayers) {
            const x = activePlayer.x
            const y = activePlayer.y

            this.gameBoard[x][y] = activePlayer.id
        }

        return this
    }

    removePlayerFromBoard(playerId) {
        for (let x = 0; x <= this.maxX + 1; x++) {
            for (let y = 0; y <= this.maxY + 1; y++) {
                if (this.gameBoard[x][y] == playerId) {
                    this.gameBoard[x][y] = 0
                }
            }
        }
    }

    addSelectableBots(bots) {
        this.selectablePlayers = this.selectablePlayers.concat(bots)

        return this
    }

    addSelectablePlayer(name, socketId) {
        if (!this.selectablePlayers.map(player => player.name).includes(name)) {
            this.selectablePlayers.push({
                name: name,
                socketId: socketId
            })
        }

        return this
    }

    setNumberOfPlayers(number) {
        const numberOfPlayersDiff = Math.abs(this.activePlayers.length - number)

        if (this.activePlayers.length > number) {
            this.removeNumberOfPlayers(numberOfPlayersDiff)
        } else if (this.activePlayers.length < number) {
            this.addNumberOfPlayers(numberOfPlayersDiff)
        }

        return this
    }

    addNumberOfPlayers(number) {
        this.addActivePlayers(Array(number).fill(this.selectablePlayers[0].name))
    }

    removePlayerWithSocketId(socketId) {
        const playerId = this.activePlayers.find(player => player.socketId == socketId).id
        this.activePlayers = this.activePlayers.filter(player => player.socketId != socketId)
        this.selectablePlayers = this.selectablePlayers.filter(player => player.socketId != socketId)

        this.removePlayerFromBoard(playerId)
    }

    removeNumberOfPlayers(number) {
        this.activePlayers = this.activePlayers.slice(0, -number)
    }

    setSimulationSpeed(speed) {
        this.simulationSpeed = speed
        return this
    }

    replaceActivePlayer(playerIndex, name) {
        const playerAtIndex = this.activePlayers[playerIndex]
        const newActivePlayer = this.createActivePlayer(name)
        newActivePlayer.id = playerAtIndex.id

        this.gameBoard[playerAtIndex.x][playerAtIndex.y] = 0
        this.activePlayers[playerIndex] = newActivePlayer

        return this
    }

    randomEmptyCoordinates() {
        let iteration = 100;
        let x = 0;
        let y = 0;
        do {
            x = Math.floor(Math.random() * this.maxX) + 1;
            y = Math.floor(Math.random() * this.maxY) + 1;
            // console.log("Random coords it:", iteration, "x:", x, "y:", y, "board:", this.gameBoard[x][y]);
            iteration -= 1;
        } while (this.squareNotEmpty(x, y) && iteration > 0);

        return [x, y];
    }

    createActivePlayer(name) {
        const player = this.selectablePlayers.find(player => player.name == name)

        const [x, y] = this.randomEmptyCoordinates()

        const activePlayerColors = this.activePlayers.map(player => player.color)
        const nonUsedColors = this.availableColors.filter(color => !activePlayerColors.includes(color))
        const color = nonUsedColors[Math.floor(Math.random() * nonUsedColors.length)];

        return {
            name: player.name,
            func: player.func != null ? player.func : null,
            id: this.activePlayers.length + 1,
            socketId: player.socketId,
            x: x,
            y: y,
            dx: 0,
            dy: -1,
            activePower: null,
            isAlive: true,
            color: color
        }
    }

    addActivePlayers(names) {
        names.forEach(name => {
            const newActivePlayer = this.createActivePlayer(name)

            this.gameBoard[newActivePlayer.x][newActivePlayer.y] = newActivePlayer.id
            this.activePlayers.push(newActivePlayer)
        })

        return this
    }

    emptyMessageBuffer() {
        this.messageBuffer = []
    }

    randomDirection() {
        const directions = [-1, 0, 1]
        return directions[Math.floor(Math.random() * directions.length)]
    }

    isFrozen(playerState) {
        return playerState.activePower != null ? playerState.activePower.name == "frozen" : false
    }

    squareIsEmpty(x, y) {
        return this.gameBoard[x][y] == 0
    }

    squareNotEmpty(x, y) {
        return this.gameBoard[x][y] != 0
    }

    playersNameInColor(activePlayer) {
        return "<span style='color: " + activePlayer.color + "'>" + activePlayer.name + "</span>";
    }

    checkForPowerUpExpiry(activePlayer) {
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

    applyPlayerMove(activePlayer, playerMoves) {
        if (this.isFrozen(activePlayer)) {
            return
        }
        if (!activePlayer.isAlive) {
            return
        }

        let playerMove = playerMoves.find(move => {
            if (move.id) {
                return move.id == activePlayer.id
            } else {
                return move.name == activePlayer.name
            }
        })

        if (playerMove == null) {
            activePlayer.x += activePlayer.dx
            activePlayer.y += activePlayer.dy
            return
        }

        activePlayer.dx = playerMove.dx
        activePlayer.dy = playerMove.dy

        if (this.isValidMove(activePlayer, playerMove)) {
            activePlayer.x += activePlayer.dx;
            activePlayer.y += activePlayer.dy;
        } else {
            activePlayer.isAlive = false
            this.pushToMessageBuffer(this.playersNameInColor(activePlayer) + " gave an invalid move ☠️")
        }
    }

    checkForDeathAfterMove(activePlayer, otherPlayers) {
        if (this.isFrozen(activePlayer)) {
            return;
        }
        if (!activePlayer.isAlive) {
            return
        }

        const playerX = activePlayer.x;
        const playerY = activePlayer.y;

        // Player hits wall or another player (they die)
        if (this.squareNotEmpty(playerX, playerY)) {
            if (this.gameBoard[playerX][playerY] == -1) {
                this.pushToMessageBuffer(this.playersNameInColor(activePlayer) + " crashed into the edge ☠️");
            } else if (this.gameBoard[playerX][playerY] == activePlayer.id) {
                this.pushToMessageBuffer(this.playersNameInColor(activePlayer) + " crashed into itself ☠️");
            } else {
                const otherPlayerId = this.gameBoard[playerX][playerY];
                const otherPlayer = otherPlayers.find(player => player.id == otherPlayerId)
                this.pushToMessageBuffer(this.playersNameInColor(activePlayer) + " crashed into " + this.playersNameInColor(otherPlayer) + " ☠️");
            }
            activePlayer.isAlive = false;
        }
        else {
            // Player hits another players head (both die)
            for (const otherPlayer of otherPlayers) {
                if (playerX == otherPlayer.x && playerY == otherPlayer.y) {
                    this.pushToMessageBuffer(this.playersNameInColor(activePlayer) + " and " + this.playersNameInColor(otherPlayer) + " crashed into each other ☠️");
                    activePlayer.isAlive = false
                    otherPlayer.isAlive = false
                    this.gameBoard[playerX][playerY] = -2;
                }

            }
        }
    }

    checkForWinners(playersAliveBeforeMoves) {
        const playersAliveAfterMoves = this.activePlayers.filter(player => player.isAlive)

        // If one player is still alive
        if (playersAliveAfterMoves.length == 1 && playersAliveBeforeMoves.length > 1) {
            return playersAliveAfterMoves
        }

        // If no players still alive
        if (playersAliveAfterMoves.length == 0) {
            // If there was more than one player alive before, but now zero players alive, it's a draw.
            if (playersAliveBeforeMoves.length > 1) {
                return playersAliveBeforeMoves
            }
        }

        return []
    }

    addWinnersToMessageBuffer(winners) {
        if (winners.length == 1) {
            const output = this.playersNameInColor(winners[0]) + " wins 🏁"
            this.pushToMessageBuffer(output)
        }

        if (winners.length > 1) {
            const winnerNames = winners.map(winner => this.playersNameInColor(winner)).join(" and ")

            this.pushToMessageBuffer(`It's a draw between ${winnerNames} 🏁`)
        }
    }

    updateGameBoardForPlayer(activePlayer) {
        if (this.isFrozen(activePlayer)) {
            return;
        }
        if (!activePlayer.isAlive) {
            return;
        }

        this.gameBoard[activePlayer.x][activePlayer.y] = activePlayer.id
    }

    checkForFoundPowerup(activePlayer) {
        if (!activePlayer.isAlive) {
            return;
        }

        if (!this.boardPowerUp) {
            return;
        }

        if (this.boardPowerUp.x == activePlayer.x && this.boardPowerUp.y == activePlayer.y) {
            this.pushToMessageBuffer(this.playersNameInColor(activePlayer) + " is " + this.boardPowerUp.name + " " + this.boardPowerUp.emoji);

            activePlayer.activePower = {
                step: this.step,
                name: this.boardPowerUp.name
            }

            this.boardPowerUp = null;
        }
    }

    addPowerUpToGameBoard() {
        // Don't add a powerup if one already on board
        if (this.boardPowerUp) {
            return;
        }

        // Don't add a powerup if one already active
        for (const activePlayer of this.activePlayers) {
            if (activePlayer.activePower) {
                return;
            }
        }

        // Create a chance of adding power up on this step
        const powerUpChance = Math.floor(Math.random() * 20);
        if (powerUpChance == 0) {
            let [x, y] = this.randomEmptyCoordinates()
            if (this.squareIsEmpty(x, y)) {
                const chosenPower = allPowerups[0];
                this.boardPowerUp = { name: chosenPower.name, emoji: chosenPower.emoji, x: x, y: y };
            }
        }

        return this
    }

    gameStep(playerMoves) {
        if (this.activePlayers.length == 0) {
            this.pushToMessageBuffer("No players left")
            this.stopGameLoop = true
            this.gameOver = true
            return
        }

        const playersAliveBeforeMoves = this.activePlayers.filter(player => player.isAlive)

        // Check for powerups found or expired
        for (const activePlayer of this.activePlayers) {
            this.checkForFoundPowerup(activePlayer)
            this.checkForPowerUpExpiry(activePlayer)
        }

        // Check for game end if no players alive
        if (playersAliveBeforeMoves.length < 1) {
            this.stopGameLoop = true
            return
        }

        // Apply the move for each player
        for (const activePlayer of this.activePlayers) {
            this.applyPlayerMove(activePlayer, playerMoves)
        }

        // Check for player deaths
        for (const activePlayer of this.activePlayers) {
            const otherPlayers = this.activePlayers.filter(player => player != activePlayer)
            this.checkForDeathAfterMove(activePlayer, otherPlayers)
        }

        // Check for winners
        const winners = this.checkForWinners(playersAliveBeforeMoves)
        if (winners.length > 0) {
            this.addWinnersToMessageBuffer(winners)
        }

        // Update game board with new player position
        for (const activePlayer of this.activePlayers) {
            this.updateGameBoardForPlayer(activePlayer)
        }

        // Add powerUp to game board
        this.addPowerUpToGameBoard()

        // Increment step
        this.step += 1;

        return this
    }

    clientState() {
        return {
            "gameBoard": this.gameBoard,
            "playerStates": this.activePlayers,
            "boardPowerUp": this.boardPowerUp
        }
    }

    pushToMessageBuffer(message) {
        this.messageBuffer.push(message)
    }

    clone() {
        return JSON.parse(JSON.stringify(this))
    }
}

async function addActivePlayerSocketsToPlayingRoom(gameState) {
    const connectedSockets = await gameClientsNameSpace.fetchSockets()
    const activePlayerSocketIds = gameState.activePlayers.map(player => player.socketId)
    const activePlayerSockets = connectedSockets.filter(socket => activePlayerSocketIds.includes(socket.id))

    for (const activePlayerSocket of activePlayerSockets) {
        activePlayerSocket.join(playingRoom)
    }
}

async function removeDeadPlayersFromPlayingRoom(gameState) {
    const playingSockets = await gameClientsNameSpace.in(playingRoom).fetchSockets()
    const deadPlayerSocketIds = gameState.activePlayers.filter(player => player.isAlive == false).map(player => player.socketId)
    const deadPlayingSockets = playingSockets.filter(socket => deadPlayerSocketIds.includes(socket.id))

    for (const deadPlayingSocket of deadPlayingSockets) {
        deadPlayingSocket.leave(playingRoom)
    }
}

async function startGame(initialGameState, gameCanvasSocket) {
    await addActivePlayerSocketsToPlayingRoom(initialGameState)

    gameCanvasSocket.emit("didStartGame");
    initialGameState.pushToMessageBuffer("And the snakes are off... ");
    clearTimeout(timer);
    gameLoop(initialGameState, gameCanvasSocket)
}

async function getPlayerMoves(currentGameState) {
    const clientState = currentGameState.clientState()

    try {
        const responses = await gameClientsNameSpace.in(playingRoom).timeout(1000).emitWithAck('clientMove', clientState);

        return responses.filter(response => response != null)
    } catch (e) {
        // some clients did not acknowledge the event in the given delay, try again
        console.log("error")
        return []
    }
}

async function gameLoop(currentGameState, gameCanvasSocket) {
    const playerMoves = await getPlayerMoves(currentGameState)
    const bots = currentGameState.activePlayers.filter(player => player.func).filter(player => player.isAlive)
    const botsMoves = bots.map(bot => apply(bot, currentGameState))

    const allActivePlayerMoves = playerMoves.concat(botsMoves)

    const lastGameState = currentGameState.clone()
    currentGameState.gameStep(allActivePlayerMoves);

    await removeDeadPlayersFromPlayingRoom(currentGameState)

    if (gameCanvasSocket) {
        gameCanvasSocket.emit('updatedGameState', lastGameState, currentGameState);
    }

    if (currentGameState.stopGameLoop) {
        clearTimeout(timer)
        return
    }

    currentGameState.emptyMessageBuffer()

    // Eased simulation speed
    const lowestSliderValue = 1
    const highestSliderValue = 1000
    const normalizedValue = (currentGameState.simulationSpeed - lowestSliderValue) / (highestSliderValue - lowestSliderValue)
    const easedValue = 1 - (1 - normalizedValue) ** 2
    const lowestLoopInterval = 1000
    const highestLoopInterval = 3
    const mapped_value = lowestLoopInterval + easedValue * (highestLoopInterval - lowestLoopInterval)

    // Set loop timer
    timer = setTimeout(function () {
        gameLoop(currentGameState, gameCanvasSocket)
    }, mapped_value);
}

function apply(bot, gameState) {
    const me = bot
    const otherPlayers = gameState.activePlayers.filter(player => player.id != bot.id)

    const botMove = bot.func(me, otherPlayers, gameState.gameBoard, gameState.boardPowerUp)
    return {
        name: bot.name,
        id: bot.id,
        dx: botMove.dx,
        dy: botMove.dy
    }
}

function initialGameState() {
    return new GameState(40, 40, 600).addSelectableBots(bots).setNumberOfPlayers(2)
}

let currentGameState = initialGameState()

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

gameClientServer.on('connection', (socket) => {
    gameCanvasSocket = socket

    console.log('game canvas connected');

    socket.emit('renderInitialGameState', currentGameState);

    socket.on('didPressStartGameButton', () => {
        if (currentGameState.step == 0) {
            startGame(currentGameState, socket)
        }
    })

    socket.on('didPressResetGameButton', (callback) => {
        clearTimeout(timer);
        currentGameState.reset()
        socket.emit('didResetGame');
        callback(currentGameState)
    })

    socket.on('replacePlayer', (index, name, callback) => {
        currentGameState.replaceActivePlayer(index, name)

        callback(currentGameState)
    })

    socket.on('setNumberOfPlayers', (numberOfPlayers, callback) => {
        currentGameState.setNumberOfPlayers(numberOfPlayers)

        callback(currentGameState)
    })

    socket.on('setSimulationSpeed', (speed) => {
        currentGameState.setSimulationSpeed(speed)
    })
});

gameClientsNameSpace.on("connection", (socket) => {
    socket.on('playerJoined', input => {
        if (input[0].name !== null) {
            const playerName = input[0].name

            console.log(`${playerName} connected`)

            currentGameState.addSelectablePlayer(playerName, socket.id)

            if (gameCanvasSocket) {
                gameCanvasSocket.emit('playerJoined', currentGameState)
            }
        }
    })

    socket.on('disconnect', () => {
        const oldGameState = currentGameState.clone()

        currentGameState.removePlayerWithSocketId(socket.id)

        // if (gameCanvasSocket) {
        //     gameCanvasSocket.emit('redrawPlayers', oldGameState, currentGameState)
        // }
    })
});

server.listen(3000, () => {
    console.log('listening on localhost:3000');
});