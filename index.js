const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const gameClientServer = new Server(server);

//import { resetGame, startGame, setUpSelectPlayer, setSpeed } from './public/src/game.js'

var timer;

function createInitialGameState(nrOfPlayers, maxX, maxY, simulationSpeed) {
    const availableColors = ['red', 'blue', 'green'];

    //start positions
    let startPositions = [];
    for (let i = 0; i < nrOfPlayers; i++) {
        let x = Math.floor(Math.random() * maxX) + 1;
        let y = Math.floor(Math.random() * maxY) + 1;
        if (startPositions.includes(x * 1000 + y)) i--;
        else startPositions[i] = x * 1000 + y;
    }

    //players
    let players = [{ name: "Tom", color: 'red' }, { name: "Timas", color: 'blue' }, { name: "Gustav", color: 'green' }]//Object.values(competitors).map((value, _) => value)

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
        players: players,
        playerState: playerState,
        playerIsAlive: playerIsAlive,
        nrOfPlayers: nrOfPlayers,
        gameOver: false,
        boardPowerUp: null
    }
}

function startGame(gameState) {
    writeOutput("And the snakes are off... ");

    clearTimeout(timer);
    gameLoop(gameState);
}

function getGameBoardCopy(gameBoard, player) {
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

function gameLoop({
    step,
    simulationSpeed,
    gameBoard,
    maxX,
    maxY,
    players,
    playerState,
    playerIsAlive,
    nrOfPlayers,
    gameOver,
    boardPowerUp }) {
    // Save copy for later

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
                $("#x" + playerState[i].x + "y" + playerState[i].y).removeClass("blink");
            }
        }
    }

    // Ask clients for their move {dx: _, dy: _}
    for (let i = 0; i < nrOfPlayers; i++) {

        if (playerIsAlive[i] && !isFrozen(playerState[i])) {

            let gameBoardCopy = getGameBoardCopy(gameBoard, i);

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
                writeOutput(playersNameInColor(players[i]) + " gave an invalid move ☠️");
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
                    writeOutput(playersNameInColor(players[i]) + " crashed into the edge ☠️");
                } else if (gameBoard[playerX][playerY] == (i + 2)) {
                    writeOutput(playersNameInColor(players[i]) + " crashed into itself ☠️");
                } else {
                    const otherSnakeIndex = gameBoard[playerX][playerY] - 2;
                    writeOutput(playersNameInColor(players[i]) + " crashed into " + playersNameInColor(players[otherSnakeIndex]) + " ☠️");
                }
                playerIsAlive[i] = false;
            }
        }

        // Player hits another players head (both die)
        for (let j = i + 1; j < nrOfPlayers; j++) {
            if (playerX == playerState[j].x && playerY == playerState[j].y) {
                if (playerIsAlive[i] && playerIsAlive[j]) {
                    writeOutput(playersNameInColor(players[i]) + " and " + playersNameInColor(players[j]) + " crashed into each other ☠️");
                } else if (playerIsAlive[i]) {
                    writeOutput(playersNameInColor(players[i]) + " crashed into " + playersNameInColor(players[j]) + " ☠️");
                } else if (playerIsAlive[j]) {
                    writeOutput(playersNameInColor(players[j]) + " crashed into " + playersNameInColor(players[i]) + " ☠️");
                }
                playerIsAlive[i] = false;
                playerIsAlive[j] = false;
                $("#x" + playerX + "y" + playerY).css("background", "#aaaaaa");
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
                $("#result").html(output);
                writeOutput(output);
            }
            gameOver = true;
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
                $("#result").html(output);
                writeOutput(output);
            }

            return
        }
    }

    // Update game board with new player head
    for (let i = 0; i < nrOfPlayers; i++) {
        if (playerIsAlive[i] && !isFrozen(playerState[i])) {
            let x = playerState[i].x;
            let y = playerState[i].y;
            let dx = playerState[i].dx;
            let dy = playerState[i].dy;
            let color = players[i].color;
            let lastX = lastPlayerState[i].x;
            let lastY = lastPlayerState[i].y;
            let lastDx = lastPlayerState[i].dx;
            let lastDy = lastPlayerState[i].dy;
            gameBoard[x][y] = i + 2;

            $("#x" + x + "y" + y).attr("style", "--color: " + color);
            $("#x" + x + "y" + y).addClass("head");
            if (dx == 1 && dy == 0) {
                $("#x" + x + "y" + y).addClass("headRight");
            } else if (dx == -1 && dy == 0) {
                $("#x" + x + "y" + y).addClass("headLeft");
            } else if (dx == 0 && dy == 1) {
                $("#x" + x + "y" + y).addClass("headDown");
            } else if (dx == 0 && dy == -1) {
                $("#x" + x + "y" + y).addClass("headUp");
            }

            $("#x" + lastX + "y" + lastY).removeClass("head").removeClass("headRight").removeClass("headLeft").removeClass("headDown").removeClass("headUp");
            if (dy == 0 && lastDy == 0) {
                $("#x" + lastX + "y" + lastY).addClass("horizontal");
            }
            else if (dx == 0 && lastDx == 0) {
                $("#x" + lastX + "y" + lastY).addClass("vertical");
            }
            else if (dx == 1 && dy == 0 && lastDx == 0 && lastDy == 1 ||
                dx == 0 && dy == -1 && lastDx == -1 && lastDy == 0) {
                $("#x" + lastX + "y" + lastY).addClass("downLeft");
            }
            else if (dx == 1 && dy == 0 && lastDx == 0 && lastDy == -1 ||
                dx == 0 && dy == 1 && lastDx == -1 && lastDy == 0) {
                $("#x" + lastX + "y" + lastY).addClass("downRight");
            }
            else if (dx == -1 && dy == 0 && lastDx == 0 && lastDy == -1 ||
                dx == 0 && dy == 1 && lastDx == 1 && lastDy == 0) {
                $("#x" + lastX + "y" + lastY).addClass("upRight");
            }
            else if (dx == -1 && dy == 0 && lastDx == 0 && lastDy == 1 ||
                dx == 0 && dy == -1 && lastDx == 1 && lastDy == 0) {
                $("#x" + lastX + "y" + lastY).addClass("upLeft");
            }
        }
    }

    // Check if any player finds a powerup
    for (let i = 0; i < nrOfPlayers; i++) {
        const playerX = playerState[i].x;
        const playerY = playerState[i].y;

        if (boardPowerUp) {
            if (boardPowerUp.x == playerX && boardPowerUp.y == playerY) {
                writeOutput(playersNameInColor(players[i]) + " is " + boardPowerUp.name + " 🧊");

                playerState[i].activePower = { name: boardPowerUp.name, step: step };
                $("#x" + playerX + "y" + playerY).removeClass("powerup_" + boardPowerUp.name);
                $("#x" + playerX + "y" + playerY).addClass("blink");
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

        if (powerX >= 0 && powerY >= 0) {
            const chosenPower = allPowerups[0];
            $("#x" + powerX + "y" + powerY).addClass("powerup_" + chosenPower.name);
            boardPowerUp = { name: chosenPower.name, id: chosenPower.id, x: powerX, y: powerY };
        }
    }

    // Run next loop
    timer = setTimeout(function () {
        const newStep = step + 1;
        gameLoop(newStep, gameBoard, players, playerState, playerIsAlive, nrOfPlayers, gameOver, boardPowerUp);
    }, simulationSpeed);
}

function isFrozen(playerState) {
    return playerState.activePower.name == "frozen"
}

function squareNotEmpty(gameBoard, x, y) {
    return gameBoard[x][y] != 0
}

function clearOutput() {
    const output = document.getElementById("output");
    output.innerHTML = "";
}

function playersNameInColor(player) {
    return "<span style='color: " + player.color + "'>" + player.name + "</span>";
}

function writeOutput(html) {
    const output = document.getElementById("output");
    output.innerHTML += "＞ " + html;
    output.innerHTML += "<br>";
    output.scrollTop = output.scrollHeight;

}

let currentGameState = createInitialGameState(2, 40, 40);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

gameClientServer.on('connection', (socket) => {
    console.log('game connected');

    socket.emit('renderInitialGameState', currentGameState);

    socket.on('startGame', () => {
        console.log('start game')
    })

    socket.on('resetGame', () => {
        currentGameState = createInitialGameState(currentGameState.nrOfPlayers, currentGameState.maxX, currentGameState.maxY);

        socket.emit('didResetGame', currentGameState);
    })

    socket.on('setNumberOfPlayers', (numberOfPlayers) => {
        currentGameState.nrOfPlayers = numberOfPlayers
        socket.emit('didChangeNumberOfPlayers', currentGameState);
    })

    socket.on('setSimulationSpeed', (speed) => {
        currentGameState.simulationSpeed = speed
    })

    socket.on('gameSpeedSelector', (data) => {
        console.log('select game speed')
    })

    socket.on('disconnect', () => {
        console.log('game disconnected');
    })
});

server.listen(3000, () => {
    console.log('listening on localhost:3000');
});