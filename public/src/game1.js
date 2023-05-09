import { allPowerups } from "./powerups.js";
import { initialGameState, setSimulationSpeed, setNumberOfPlayers } from "./gameStateMutators.js";
import { competitors } from "./competitors.js";

// export function setSpeed(value) {
//     simulationSpeed = 1000 / value;
// }

var currentGameState;

export function resetGame() {
    console.log(competitors);
    currentGameState = initialGameState(2, 40, 40, competitors, 10);
    initBoard(currentGameState);
    setUpSelectPlayers(currentGameState.players);
}

export function startGame() {
    writeOutput("And the snakes are off... ");

    $("#startBtn").hide();
    clearTimeout(currentGameState.timer);

    gameLoop(currentGameState);
}

resetGame();
startGame();

function initBoard(gameState) {
    $("#board").html("");
    let board = document.getElementById("board");
    let tbl = document.createElement("table");
    tbl.setAttribute("id", "gameboard");
    for (let y = 1; y <= gameState.gameBoard[0].length; y++) {
        let row = document.createElement("tr");
        for (let x = 1; x <= gameState.gameBoard.length; x++) {
            let cell = document.createElement("td");
            let id = "x" + x + "y" + y;
            cell.setAttribute("id", id);
            cell.setAttribute("class", "box");
            row.appendChild(cell);
        }
        tbl.appendChild(row);
    }
    board.appendChild(tbl);

    $(".box").attr("style", "");
    $(".box").attr("class", "box");
    for (let i = 0; i < gameState.nrOfPlayers; i++) {
        let y = gameState.playerState[i].y;
        let x = gameState.playerState[i].x;
        let color = gameState.players[i].color;
        $("#x" + x + "y" + y).attr("style", "--color:" + color);
        $("#x" + x + "y" + y).addClass("head").addClass("headUp");
    }
    $("#startBtn").show();
    $("#result").css("color", "white");
    $("#result").html("");
    for (let i = 0; i < gameState.nrOfPlayers; i++) {
        let vs = " vs ";
        if (i == 0) vs = "";
        $("#result").append(vs + playersNameInColor(gameState.players[i]));
    }

    clearOutput();
}

function setUpSelectPlayers(players) {
    for (let i = 1; i <= 6; i++) {
        $("#player" + i).html("");
        if (i <= players.length) {
            for (let player of players) {
                $(".player" + i).show();
                let option = document.createElement("option");
                option.setAttribute("value", player);
                option.innerHTML = player.name;
                document.getElementById("player" + i).appendChild(option);
            }
        }
        else {
            $(".player" + i).hide();
        }
    }
}

function getGameBoardCopy(gameBoard, player, maxX, maxY) {
    let gameBoardCopy = JSON.parse(JSON.stringify(gameBoard));
    let playerNr = player + 2;
    for (let x = 1; x <= maxX - 1; x++) {
        for (let y = 1; y <= maxY - 1; y++) {
            if (gameBoardCopy[x][y] == playerNr) {
                gameBoardCopy[x][y] = 1;
            }
        }
    }
    return gameBoardCopy;
}

function gameLoop(gameState) {
    console.log(gameState);
    // Save copy for later
    let lastPlayerState = JSON.parse(JSON.stringify(gameState.playerState));

    let playersAliveAtBeginningOfStep = [];
    for (let i = 0; i < gameState.nrOfPlayers; i++) {
        if (gameState.playerIsAlive[i]) {
            playersAliveAtBeginningOfStep.push(i);
        }
    }

    // Check for powerup expiry
    for (let i = 0; i < gameState.nrOfPlayers; i++) {
        if (isFrozen(gameState.playerState[i])) {
            const stepsSinceActive = gameState.step - (gameState.playerState[i].activePower.step)
            if (stepsSinceActive > 20) {
                gameState.playerState[i].activePower = { name: null, step: gameState.step }
                $("#x" + gameState.playerState[i].x + "y" + gameState.playerState[i].y).removeClass("blink");
            }
        }
    }

    // Ask clients for their move {dx: _, dy: _}
    for (let i = 0; i < gameState.nrOfPlayers; i++) {

        if (gameState.playerIsAlive[i] && !isFrozen(gameState.playerState[i])) {

            let gameBoardCopy = getGameBoardCopy(gameState.gameBoard, i, gameState.maxX, gameState.maxY);

            let playerStateCopy = JSON.parse(JSON.stringify(gameState.playerState));
            let otherPlayersState = {};
            let myState;
            for (let p = 0; p < gameState.nrOfPlayers; p++) {
                if (p == i) {
                    myState = playerStateCopy[p];
                } else {
                    let playerNr = p + 2;
                    otherPlayersState[playerNr] = playerStateCopy[p];
                }
            }

            let move = gameState.players[i].func(myState, playerStateCopy, gameBoardCopy, gameState.boardPowerUp);
            gameState.playerState[i].dx = move.dx;
            gameState.playerState[i].dy = move.dy;
        }
    }

    // Move players according to their selected move.
    for (let i = 0; i < gameState.nrOfPlayers; i++) {
        if (gameState.playerIsAlive[i] && !isFrozen(gameState.playerState[i])) {
            let validMove = false;
            let dx = gameState.playerState[i].dx;
            let dy = gameState.playerState[i].dy;

            if (dx == -1 && dy == 0 ||
                dx == 1 && dy == 0 ||
                dx == 0 && dy == 1 ||
                dx == 0 && dy == -1) {
                validMove = true;
            }

            if (gameState.playerState[i].activePower.name == "diagonal") {
                if (dx == -1 && dy == -1 ||
                    dx == 1 && dy == -1 ||
                    dx == -1 && dy == 1 ||
                    dx == 1 && dy == 1) {
                    validMove = true;
                }
            }

            if (validMove) {
                gameState.playerState[i].x += dx;
                gameState.playerState[i].y += dy;
            } else {
                writeOutput(playersNameInColor(gameState.players[i]) + " gave an invalid move ☠️");
                gameState.playerIsAlive[i] = false;
            }
        }
    }

    // Check if player gets killed
    for (let i = 0; i < gameState.nrOfPlayers; i++) {
        const playerX = gameState.playerState[i].x;
        const playerY = gameState.playerState[i].y;

        if (gameState.playerIsAlive[i] && !isFrozen(gameState.playerState[i])) {
            // Player hits wall or snake (they die)
            if (squareNotEmpty(gameState.gameBoard, playerX, playerY)) {
                if (gameState.gameBoard[playerX][playerY] == -1) {
                    writeOutput(playersNameInColor(gameState.players[i]) + " crashed into the edge ☠️");
                } else if (gameState.gameBoard[playerX][playerY] == (i + 2)) {
                    writeOutput(playersNameInColor(gameState.players[i]) + " crashed into itself ☠️");
                } else {
                    const otherSnakeIndex = gameState.gameBoard[playerX][playerY] - 2;
                    writeOutput(playersNameInColor(gameState.players[i]) + " crashed into " + playersNameInColor(gameState.players[otherSnakeIndex]) + " ☠️");
                }
                gameState.playerIsAlive[i] = false;
            }
        }

        // Player hits another players head (both die)
        for (let j = i + 1; j < gameState.nrOfPlayers; j++) {
            if (playerX == gameState.playerState[j].x && playerY == gameState.playerState[j].y) {
                if (gameState.playerIsAlive[i] && gameState.playerIsAlive[j]) {
                    writeOutput(playersNameInColor(gameState.players[i]) + " and " + playersNameInColor(gameState.players[j]) + " crashed into each other ☠️");
                } else if (gameState.playerIsAlive[i]) {
                    writeOutput(playersNameInColor(gameState.players[i]) + " crashed into " + playersNameInColor(gameState.players[j]) + " ☠️");
                } else if (gameState.playerIsAlive[j]) {
                    writeOutput(playersNameInColor(gameState.players[j]) + " crashed into " + playersNameInColor(gameState.players[i]) + " ☠️");
                }
                gameState.playerIsAlive[i] = false;
                gameState.playerIsAlive[j] = false;
                $("#x" + playerX + "y" + playerY).css("background", "#aaaaaa");
            }
        }
    }

    // Check for a winner
    if (gameState.playerIsAlive.includes(false)) {
        let nrOfPlayersAlive = 0;
        let winner = 0;
        for (let i = 0; i < gameState.nrOfPlayers; i++) {
            if (gameState.playerIsAlive[i]) {
                nrOfPlayersAlive++;
                winner = i;
            }
        }

        if (nrOfPlayersAlive == 1) {
            if (playersAliveAtBeginningOfStep.length > 1) {
                let output = playersNameInColor(gameState.players[winner]) + " wins 🏁";
                $("#result").html(output);
                writeOutput(output);
            }
            gameState.gameOver = true;
        }

        // Check for end of game when no players alive
        if (nrOfPlayersAlive == 0) {
            // If there was more than one player alive before, but now zero players alive, it's a draw.
            if (playersAliveAtBeginningOfStep.length > 1) {
                let output = "It's a draw between ";
                for (let drawPlayerIndex = 0; drawPlayerIndex < playersAliveAtBeginningOfStep.length; drawPlayerIndex++) {
                    output = output + playersNameInColor(gameState.players[drawPlayerIndex]);
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
    for (let i = 0; i < gameState.nrOfPlayers; i++) {
        if (gameState.playerIsAlive[i] && !isFrozen(gameState.playerState[i])) {
            let x = gameState.playerState[i].x;
            let y = gameState.playerState[i].y;
            let dx = gameState.playerState[i].dx;
            let dy = gameState.playerState[i].dy;
            let color = gameState.players[i].color;
            let lastX = lastPlayerState[i].x;
            let lastY = lastPlayerState[i].y;
            let lastDx = lastPlayerState[i].dx;
            let lastDy = lastPlayerState[i].dy;
            gameState.gameBoard[x][y] = i + 2;

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
    for (let i = 0; i < gameState.nrOfPlayers; i++) {
        const playerX = gameState.playerState[i].x;
        const playerY = gameState.playerState[i].y;

        if (gameState.boardPowerUp) {
            if (gameState.boardPowerUp.x == playerX && gameState.boardPowerUp.y == playerY) {
                writeOutput(playersNameInColor(gameState.players[i]) + " is " + gameState.boardPowerUp.name + " 🧊");

                gameState.playerState[i].activePower = { name: gameState.boardPowerUp.name, step: gameState.step };
                $("#x" + playerX + "y" + playerY).removeClass("powerup_" + gameState.boardPowerUp.name);
                $("#x" + playerX + "y" + playerY).addClass("blink");
                gameState.boardPowerUp = null;

            }
        }
    }

    // Add powerup to board if needed
    const powerUpChance = Math.floor(Math.random() * 20);
    if (!gameState.boardPowerUp && powerUpChance == 0) {
        let iteration = 10;
        let powerX = -1;
        let powerY = -1;

        console.log(gameState.maxX, gameState.maxY);

        do {
            powerX = Math.round(Math.random() * gameState.maxX);
            powerY = Math.round(Math.random() * gameState.maxY);
            iteration -= 1;
        } while (squareNotEmpty(gameState.gameBoard, powerX, powerY) && iteration > 0);

        if (powerX >= 0 && powerY >= 0) {
            const chosenPower = allPowerups[0];
            $("#x" + powerX + "y" + powerY).addClass("powerup_" + chosenPower.name);
            gameState.boardPowerUp = { name: chosenPower.name, id: chosenPower.id, x: powerX, y: powerY };
        }
    }

    // Run next loop
    gameState.timer = setTimeout(function () {
        const newStep = gameState.step + 1;
        gameState.step = newStep
        gameLoop(gameState)
    }, gameState.simulationSpeed);
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