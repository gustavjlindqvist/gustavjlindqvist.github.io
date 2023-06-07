const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require("socket.io")
const gameClientServer = new Server(server, {
    pingInterval: 1000,
    pingTimeout: 1000,
    cors: {
        origin: "http://localhost:5173",
      }
})

const { getBots } = require('./bots')

var timer
var gameCanvasSocket

const gameClientsNameSpace = gameClientServer.of("/gameClient")
const playingRoom = "playingRoom"

class GameState {
    constructor(maxX, maxY, simulationSpeed) {
        this.step = 0
        this.availableColors = ["#d39", "#3d9", "#d93", "#39d", "#93d", "#9d3", "#7ff", "#f5f", "#ff7"]
        this.simulationSpeed = simulationSpeed
        this.gameBoard = this.initialGameBoard(maxX, maxY)
        this.maxX = maxX
        this.maxY = maxY
        this.selectablePlayers = []
        this.activePlayers = []
        this.messageBuffer = []
        this.stopGameLoop = false
        this.gameOver = false
    }

    initialGameBoard(maxX, maxY) {
        let gameBoard = []
        for (let x = 0; x <= maxX + 1; x++) {
            gameBoard[x] = []
            for (let y = 0; y <= maxY + 1; y++) {
                gameBoard[x][y] = 0
                if (x == 0 || x == maxX + 1 || y == 0 || y == maxY + 1)
                    gameBoard[x][y] = -1
            }
        }

        return gameBoard
    }

    reset() {
        this.step = 0
        this.gameBoard = this.initialGameBoard(this.maxX, this.maxY)
        this.messageBuffer = []
        this.stopGameLoop = false

        this.activePlayers.forEach(player => {

            let [x, y] = this.randomEmptyCoordinates()
            let [dx, dy] = this.randomDirection()
            player.x = x
            player.y = y
            player.isAlive = true
            player.dx = dx
            player.dy = dy

            // Update game board with player's starting position
            this.gameBoard[x][y] = player.id
        })
    }

    removePlayerFromBoard(playerId) {
        for (let x = 1; x <= this.maxX; x++) {
            for (let y = 1; y <= this.maxY; y++) {
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
        const player = this.activePlayers.find(player => player.socketId == socketId)
        this.activePlayers = this.activePlayers.filter(player => player.socketId != socketId)
        this.selectablePlayers = this.selectablePlayers.filter(player => player.socketId != socketId)

        if (this.step > 0) {
            this.pushToMessageBuffer(this.playersNameInColor(player) + " was removed from the game")

            if (this.activePlayers.length == 1) {
                this.addWinnersToMessageBuffer(this.activePlayers)
            }
        }
    }

    removeNumberOfPlayers(number) {
        this.activePlayers = this.activePlayers.slice(0, -number)
        this.gameBoard = this.initialGameBoard(this.maxX, this.maxY)

        for (const activePlayer of this.activePlayers) {
            this.gameBoard[activePlayer.x][activePlayer.y] = activePlayer.id
        }
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
        this.gameBoard[newActivePlayer.x][newActivePlayer.y] = newActivePlayer.id
        this.activePlayers[playerIndex] = newActivePlayer

        return playerAtIndex
    }

    randomDirection() {
        let startDirection = [[0,1],[0,-1],[1,0],[-1,0]]
        let d = Math.floor(Math.random() * 4)
        return [startDirection[d][0], startDirection[d][1]]
    }

    randomEmptyCoordinates() {
        let iteration = 100
        let x = 0
        let y = 0
        do {
            x = Math.floor(Math.random() * this.maxX) + 1
            y = Math.floor(Math.random() * this.maxY) + 1
            // console.log("Random coords it:", iteration, "x:", x, "y:", y, "board:", this.gameBoard[x][y])
            iteration -= 1
        } while (this.squareNotEmpty(x, y) && iteration > 0)

        return [x, y]
    }

    createActivePlayer(name) {
        const player = this.selectablePlayers.find(player => player.name == name)

        const [x, y] = this.randomEmptyCoordinates()
        const [dx, dy] = this.randomDirection()

        const activePlayerColors = this.activePlayers.map(player => player.color)
        const nonUsedColors = this.availableColors.filter(color => !activePlayerColors.includes(color))
        const color = nonUsedColors[Math.floor(Math.random() * nonUsedColors.length)]

        return {
            name: player.name,
            func: player.func != null ? player.func : null,
            id: this.newPlayerId(),
            socketId: player.socketId,
            x: x,
            y: y,
            dx: dx,
            dy: dy,
            isAlive: true,
            color: color
        }
    }

    newPlayerId() {
        for (let i = 1; i < 20; i++) {
            if (!this.activePlayers.map(player => player.id).includes(i)) {
                return i
            }
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

    squareIsEmpty(x, y) {
        return this.gameBoard[x][y] == 0
    }

    squareNotEmpty(x, y) {
        return this.gameBoard[x][y] != 0
    }

    playersNameInColor(activePlayer) {
        if (activePlayer) {
            return "<span style='color: " + activePlayer.color + "'>" + activePlayer.name + "</span>"
        }
    }

    isValidMove(playerMove) {
        const dx = playerMove.dx
        const dy = playerMove.dy

        if (dx == -1 && dy == 0 ||
            dx == 1 && dy == 0 ||
            dx == 0 && dy == 1 ||
            dx == 0 && dy == -1) {
            return true
        }

        return false
    }

    applyPlayerMove(activePlayer, playerMoves) {
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

        if (this.isValidMove(playerMove)) {
            activePlayer.x += activePlayer.dx
            activePlayer.y += activePlayer.dy
        } else {
            activePlayer.isAlive = false
            this.pushToMessageBuffer(this.playersNameInColor(activePlayer) + " gave an invalid move ☠️")
        }
    }

    checkForDeathAfterMove(activePlayer, otherPlayers) {
        if (!activePlayer.isAlive) {
            return
        }

        const playerX = activePlayer.x
        const playerY = activePlayer.y

        // Player hits wall or another player (they die)
        if (this.squareNotEmpty(playerX, playerY)) {
            if (this.gameBoard[playerX][playerY] == -1) {
                this.pushToMessageBuffer(this.playersNameInColor(activePlayer) + " crashed into the edge ☠️")
            } else if (this.gameBoard[playerX][playerY] == activePlayer.id) {
                this.pushToMessageBuffer(this.playersNameInColor(activePlayer) + " crashed into itself ☠️")
            } else {
                const otherPlayerId = this.gameBoard[playerX][playerY]
                const otherPlayer = otherPlayers.find(player => player.id == otherPlayerId)
                this.pushToMessageBuffer(this.playersNameInColor(activePlayer) + " crashed into " + this.playersNameInColor(otherPlayer) + " ☠️")
            }
            activePlayer.isAlive = false
        }
        else {
            // Player hits another players head (both die)
            for (const otherPlayer of otherPlayers) {
                if (playerX == otherPlayer.x && playerY == otherPlayer.y) {
                    this.pushToMessageBuffer(this.playersNameInColor(activePlayer) + " and " + this.playersNameInColor(otherPlayer) + " crashed into each other ☠️")
                    activePlayer.isAlive = false
                    otherPlayer.isAlive = false
                    this.gameBoard[playerX][playerY] = -2
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
        if (!activePlayer.isAlive) {
            return
        }

        this.gameBoard[activePlayer.x][activePlayer.y] = activePlayer.id
    }

    gameStep(playerMoves) {
        if (this.activePlayers.length == 0) {
            this.pushToMessageBuffer("No players left")
            this.stopGameLoop = true
            this.gameOver = true
            return
        }

        const playersAliveBeforeMoves = this.activePlayers.filter(player => player.isAlive)

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

        // Increment step
        this.step += 1

        return this
    }

    clientState() {
        return {
            "gameBoard": this.gameBoard,
            "playerStates": this.activePlayers
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

    gameCanvasSocket.emit("didStartGame")
    initialGameState.pushToMessageBuffer("And the snakes are off... ")
    clearTimeout(timer)
    gameLoop(initialGameState, gameCanvasSocket)
}

async function getPlayerMoves(currentGameState) {
    const clientState = currentGameState.clientState()

    try {
        const responses = await gameClientsNameSpace.in(playingRoom).timeout(1000).emitWithAck('clientMove', clientState)

        return responses.filter(response => response != null)
    } catch (e) {
        // some clients did not acknowledge the event in the given delay, try again
        console.log("error")
        return []
    }
}

async function removeSocketFromPlayingRoom(socketId) {
    if (socketId) {
        const sockets = await gameClientsNameSpace.in(playingRoom).fetchSockets()
        const socketToLeave = sockets.find(socket => socket.id == socketId)

        if (socketToLeave) {
            socketToLeave.leave(playingRoom)
        }
    }
}

async function gameLoop(currentGameState, gameCanvasSocket) {
    const playerMoves = await getPlayerMoves(currentGameState)
    const bots = currentGameState.activePlayers.filter(player => player.func).filter(player => player.isAlive)
    const botsMoves = bots.map(bot => apply(bot, currentGameState))

    const allActivePlayerMoves = playerMoves.concat(botsMoves)

    const lastGameState = currentGameState.clone()
    currentGameState.gameStep(allActivePlayerMoves)

    await removeDeadPlayersFromPlayingRoom(currentGameState)

    if (gameCanvasSocket) {
        gameCanvasSocket.emit('updatedGameState', lastGameState, currentGameState)
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
    }, mapped_value)
}

function apply(bot, gameState) {
    const me = bot
    const otherPlayers = gameState.activePlayers.filter(player => player.id != bot.id)

    const botMove = bot.func(me, otherPlayers, gameState.gameBoard)
    return {
        name: bot.name,
        id: bot.id,
        dx: botMove.dx,
        dy: botMove.dy
    }
}

function initialGameState() {
    const selectableBots = getBots()
    return new GameState(40, 40, 600).addSelectableBots(selectableBots).setNumberOfPlayers(2)
}

let currentGameState = initialGameState()

app.use(express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

gameClientServer.on('connection', (socket) => {
    gameCanvasSocket = socket

    console.log('game canvas connected')

    socket.emit('renderInitialGameState', currentGameState)

    socket.on('didPressStartGameButton', () => {
        if (currentGameState.step == 0) {
            startGame(currentGameState, socket)
        }
    })

    socket.on('didPressResetGameButton', (callback) => {
        clearTimeout(timer)
        currentGameState.reset()
        socket.emit('didResetGame')
        callback(currentGameState)
    })

    socket.on('replacePlayer', (index, name, callback) => {
        const oldPlayer = currentGameState.replaceActivePlayer(index, name)
        removeSocketFromPlayingRoom(oldPlayer.socketId)

        callback(currentGameState)
    })

    socket.on('setNumberOfPlayers', (numberOfPlayers, callback) => {
        currentGameState.setNumberOfPlayers(numberOfPlayers)

        callback(currentGameState)
    })

    socket.on('setSimulationSpeed', (speed) => {
        currentGameState.setSimulationSpeed(speed)
    })
})

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
        currentGameState.removePlayerWithSocketId(socket.id)

        if (gameCanvasSocket && currentGameState.step == 0) {
            gameCanvasSocket.emit('playerDisconnected', currentGameState)
        }
    })
})

server.listen(3000, () => {
    console.log('listening on localhost:3000')
})