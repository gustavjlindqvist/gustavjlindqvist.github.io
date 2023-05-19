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
        this.gameBoard
        this.step = 0
        this.availableColors = ["#d39", "#3d9", "#d93", "#39d", "#93d", "#9d3", "#7ff", "#f5f", "#7ff", "#ff7"]
        this.simulationSpeed = simulationSpeed
        this.gameBoard = this.initialGameBoard(maxX, maxY)
        this.maxX = maxX
        this.maxY = maxY
        this.selectablePlayers = []
        this.activePlayers = []
        this.gameOver = false
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
        this.step = 0
        this.gameBoard = this.initialGameBoard(this.maxX, this.maxY)
        this.gameOver = false
        this.boardPowerUp = null
        this.messageBuffer = []
        this.stopGameLoop = false

        this.activePlayers.forEach(player => {
            const [x, y] = this.randomCoordinates()

            player.x = x
            player.y = y
            player.isAlive = true
            player.dx = 0
            player.dy = -1
            player.activePower = null
        })
    }

    addSelectableBots(bots) {
        this.selectablePlayers = this.selectablePlayers.concat(bots)

        return this
    }

    addSelectablePlayer(name) {
        if (!this.selectablePlayers.map(player => player.name).includes(name)) {
            this.selectablePlayers.push({
                name: name
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

    removeNumberOfPlayers(number) {
        this.activePlayers = this.activePlayers.slice(0, -number)
    }

    setSimulationSpeed(speed) {
        this.simulationSpeed = speed

        return this
    }

    addActivePowerToPlayer(id, power) {
        const player = this.activePlayers.find(player => player.id == id)

        player.activePower = power

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

    randomCoordinates() {
        let x = Math.floor(Math.random() * this.maxX) + 1;
        let y = Math.floor(Math.random() * this.maxY) + 1;

        return [x, y]
    }

    createActivePlayer(name) {
        const player = this.selectablePlayers.find(player => player.name == name)

        const [x, y] = this.randomCoordinates()

        const activePlayerColors = this.activePlayers.map(player => player.color)
        const nonUsedColors = this.availableColors.filter(color => !activePlayerColors.includes(color))
        const color = nonUsedColors[Math.floor(Math.random() * nonUsedColors.length)];

        return {
            name: player.name,
            func: player.func != null ? player.func : null,
            id: this.activePlayers.length + 1,
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

        if (activePlayer.isAlive && !this.isFrozen(activePlayer)) {
            if (this.isValidMove(activePlayer, playerMove)) {
                activePlayer.x += activePlayer.dx;
                activePlayer.y += activePlayer.dy;
            } else {
                activePlayer.isAlive = false
                this.pushToMessageBuffer(this.playersNameInColor(activePlayer) + " gave an invalid move ☠️")
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

    updateGameboard(activePlayer) {
        // Update game board with new player head
        if (activePlayer.isAlive && !this.isFrozen(activePlayer)) {
            this.gameBoard[activePlayer.x][activePlayer.y] = activePlayer.id
        }
    }

    checkPlayerFoundPowerup(activePlayer) {
        // Check if any player finds a powerup
        const playerX = activePlayer.x;
        const playerY = activePlayer.y;

        if (this.boardPowerUp) {
            if (this.boardPowerUp.x == playerX && this.boardPowerUp.y == playerY) {
                this.pushToMessageBuffer(activePlayer) + " is " + this.boardPowerUp.name + " 🧊";

                activePlayer.activePower = {
                    step: 0,
                    ...this.boardPowerUp
                }

                this.boardPowerUp = null;
            }
        }
    }

    addRandomPowerUpToBoardIfNeeded() {
        // Add powerup to board if needed
        const powerUpChance = Math.floor(Math.random() * 20);
        if (!this.boardPowerUp && powerUpChance == 0) {
            let iteration = 10;
            let powerX = -1;
            let powerY = -1;
            do {
                powerX = Math.round(Math.random() * this.maxX);
                powerY = Math.round(Math.random() * this.maxY);
                iteration -= 1;

            } while (this.squareNotEmpty(powerX, powerY) && iteration > 0);

            if (iteration > 0) {
                const chosenPower = allPowerups[0];
                this.boardPowerUp = { name: chosenPower.name, id: chosenPower.id, x: powerX, y: powerY };
            }
        }
    }

    gameStep(playerMoves) {
        // Save copy for later
        let messages = []

        //let lastPlayerState = JSON.parse(JSON.stringify(this.playerState));
        const playersAliveBeforeMoves = this.activePlayers.filter(player => player.isAlive)

        if (playersAliveBeforeMoves.length < 1) {
            this.stopGameLoop = true
            return
        }

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
        }

        for (const activePlayer of this.activePlayers) {
            this.updateGameboard(activePlayer)
            //this.checkPlayerFoundPowerup(activePlayer)
        }

        this.addRandomPowerUpToBoardIfNeeded()

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
        if (!this.gameOver) {
            this.messageBuffer.push(message)
        }
    }

    clone() {
        return JSON.parse(JSON.stringify(this))
    }
}

function startGame(initialGameState, gameCanvasSocket) {
    initialGameState.pushToMessageBuffer("And the snakes are off... ");
    clearTimeout(timer);
    gameLoop(initialGameState, gameCanvasSocket)
}

async function getPlayerMoves(currentGameState) {
    const clientState = currentGameState.clientState()

    try {
        const responses = await gameClientsNameSpace.timeout(1000).emitWithAck('clientMove', clientState);

        return responses
    } catch (e) {
        // some clients did not acknowledge the event in the given delay, try again
        console.log("error")
        return []
    }
}

async function gameLoop(currentGameState, gameCanvasSocket) {
    const playerMoves = await getPlayerMoves(currentGameState)
    const bots = currentGameState.activePlayers.filter(player => player.func)
    const botsMoves = bots.map(bot => apply(bot, currentGameState))

    const allActivePlayerMoves = playerMoves.concat(botsMoves)

    const lastGameState = currentGameState.clone()
    currentGameState.gameStep(allActivePlayerMoves);

    if (gameCanvasSocket) {
        gameCanvasSocket.emit('updatedGameState', lastGameState, currentGameState);
    }

    if (currentGameState.stopGameLoop) {
        clearTimeout(timer)
        return
    }

    currentGameState.emptyMessageBuffer()

    timer = setTimeout(function () {
        gameLoop(currentGameState, gameCanvasSocket)
    }, currentGameState.simulationSpeed);
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
    return new GameState(40, 40, 100).addSelectableBots(bots).setNumberOfPlayers(2)
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

    socket.on('startGame', () => {
        startGame(currentGameState, socket)
    })

    socket.on('resetGame', (callback) => {
        clearTimeout(timer);
        currentGameState.reset()

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

            currentGameState.addSelectablePlayer(playerName)

            if (gameCanvasSocket) {
                gameCanvasSocket.emit('playerJoined', currentGameState)
            }
        }
    })
});

server.listen(3000, () => {
    console.log('listening on localhost:3000');
});