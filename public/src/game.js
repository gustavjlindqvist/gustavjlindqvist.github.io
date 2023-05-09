import { allPowerups } from "./powerups.js";

var timer, simulationSpeed = 100;
var nrOfPlayers = 2, startPositions = [], players = [];
const maxY = 40;
const maxX = 40;

export function initBoard(gameBoard) {
    $("#board").html("");
    let board = document.getElementById("board");
    let tbl = document.createElement("table");
    tbl.setAttribute("id", "gameboard");
    for (let y = 1; y <= gameBoard[0].length; y++) {
        let row = document.createElement("tr");
        for (let x = 1; x <= gameBoard.length; x++) {
            let cell = document.createElement("td");
            let id = "x" + x + "y" + y;
            cell.setAttribute("id", id);
            cell.setAttribute("class", "box");
            row.appendChild(cell);
        }
        tbl.appendChild(row);
    }
    board.appendChild(tbl);
}
//initBoard();

export function setSpeed(value) {
    simulationSpeed = 1000 / value;
}

export function setUpSelectPlayer(gameState) {
    for (let i = 1; i <= 6; i++) {
        $("#player" + i).html("");
        if (i <= gameState.nrOfPlayers) {
            for (let c of gameState.players) {
                $(".player" + i).show();
                let option = document.createElement("option");
                option.setAttribute("value", c);
                option.innerHTML = c.name;
                document.getElementById("player" + i).appendChild(option);
            }
        }
        else {
            $(".player" + i).hide();
        }
    }
}

export function initPlayerPositions(gameState) {
    $(".box").attr("style", "");
    $(".box").attr("class", "box");
    for (let i = 0; i < gameState.nrOfPlayers; i++) {
        let y = gameState.playerState[i].y;
        let x = gameState.playerState[i].x;
        console.log(x, y);
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
}

export function resetGame() {
    clearTimeout(timer);
    startPositions = [];
    for (let i = 0; i < nrOfPlayers; i++) {
        let x = Math.floor(Math.random() * maxX) + 1;
        let y = Math.floor(Math.random() * maxY) + 1;
        if (startPositions.includes(x * 1000 + y)) i--;
        else startPositions[i] = x * 1000 + y;
    }

    players = [];
    for (let i = 1; i <= nrOfPlayers; i++) {
        players[i - 1] = competitors[$("#player" + i).find(":selected").val()];
    }

    $(".box").attr("style", "");
    $(".box").attr("class", "box");
    for (let i = 0; i < nrOfPlayers; i++) {
        let y = startPositions[i] % 1000;
        let x = Math.round((startPositions[i] - y) / 1000);
        let color = players[i].color;
        $("#x" + x + "y" + y).attr("style", "--color:" + color);
        $("#x" + x + "y" + y).addClass("head").addClass("headUp");
    }
    $("#startBtn").show();
    $("#result").css("color", "white");
    $("#result").html("");
    for (let i = 0; i < nrOfPlayers; i++) {
        let vs = " vs ";
        if (i == 0) vs = "";
        $("#result").append(vs + playersNameInColor(players[i]));
    }

    clearOutput();
}

export function startGame() {
    writeOutput("And the snakes are off... ");

    $("#startBtn").hide();
    clearTimeout(timer);
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
    gameLoop(0, gameBoard, players, playerState, playerIsAlive, nrOfPlayers, false, null);
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

function renderGameState(gameState) {

}

function gameLoop(step, gameBoard, players, playerState, playerIsAlive, nrOfPlayers, gameOver, boardPowerUp) {
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

//-----------------
// PLAYER FUNCTIONS
//-----------------

function randomFunc(me, otherPlayers, gameBoard, boardPowerUp) {
    let dx, dy;
    let maxIterations = 20;
    do {
        const random = Math.random();

        dx = 0;
        dy = 0;

        if (random < 0.125)
            dx = -1;
        else if (random < 0.25)
            dx = 1;
        else if (random < 0.375)
            dy = -1;
        else if (random < 0.5)
            dy = 1;
        else {
            dx = me.dx;
            dy = me.dy;
        }

        maxIterations -= 1;

    } while (gameBoard[me.x + dx][me.y + dy] != 0 && maxIterations > 0);

    return { dx: dx, dy: dy };
}

function rightFunc(me, otherPlayers, gameBoard, boardPowerUp) {
    let dx = 0, dy = 0;
    if (me.dx == 1) // right
        dy = 1;
    else if (me.dy == 1) // down
        dx = -1;
    else if (me.dx == -1) // left
        dy = -1;
    else if (me.dy == -1) // up
        dx = 1;

    if (gameBoard[me.x + me.dx][me.y + me.dy] == 0) return { dx: me.dx, dy: me.dy };
    else return { dx: dx, dy: dy };
}

function powerHunterFunc(me, otherPlayers, gameBoard, boardPowerUp) {
    let dx = me.dx;
    let dy = me.dy;

    // Try and move towards power up
    if (boardPowerUp) {
        const px = boardPowerUp.x;
        const py = boardPowerUp.y;

        const powerUpIsToRight = me.x < px;
        const powerUpIsAbove = me.y < py;

        // Moving vertically away from powerup, so turn horizontally to it
        if ((me.dy == 1 && py <= me.y) || (me.dy == -1 && py >= me.y)) {
            dx = powerUpIsToRight ? 1 : -1;
            dy = 0;
        }

        // Moving horizontally way from powerup, so turn vertically to it
        else if ((me.dx == 1 && px <= me.x) || (me.dx == -1 && px >= me.x)) {
            dx = 0;
            dy = powerUpIsAbove ? 1 : -1
        }
    }

    // Check move is ok and try another if not
    let iteration = 4;
    while (gameBoard[me.x + dx][me.y + dy] != 0 && iteration > 0) {
        if (dx == 1) { // right -> down
            dx = 0;
            dy = 1;
        }
        else if (dy == 1) { // down -> left
            dx = -1;
            dy = 0;
        }
        else if (dx == -1) { // left -> up
            dx = 0;
            dy = -1;
        }
        else if (dy == -1) { // up -> right
            dx = 1;
            dy = 0;
        }
        iteration -= 1;
    }

    return { dx: dx, dy: dy };
}

function leftFunc(me, otherPlayers, gameBoard, boardPowerUp) {
    let dx = 0, dy = 0;
    if (me.dx == 1) // right
        dy = -1;
    else if (me.dy == -1) // up
        dx = -1;
    else if (me.dx == -1) // left
        dy = 1;
    else if (me.dy == 1) // down
        dx = 1;

    if (gameBoard[me.x + me.dx][me.y + me.dy] == 0) return { dx: me.dx, dy: me.dy };
    else return { dx: dx, dy: dy };
}

function bullyFunc(me, otherPlayers, gameBoard, boardPowerUp) {
    let x = me.x;
    let y = me.y;
    let best = 9999;
    let target = 0;

    for (let p = 0; p < otherPlayers.length; p++) {
        let d = Math.abs(otherPlayers[p].x - x) + Math.abs(otherPlayers[p].y - y);
        if (d > 0 && d < best) {
            best = d;
            target = p;
        }
    }

    let x2 = otherPlayers[target].x;
    let y2 = otherPlayers[target].y;
    let dx = x2 - x;
    let dy = y2 - y;
    if (dx > 0 && Math.abs(dx) > Math.abs(dy) && gameBoard[x + 1][y] == 0) return { dx: 1, dy: 0 };
    if (dx < 0 && Math.abs(dx) > Math.abs(dy) && gameBoard[x - 1][y] == 0) return { dx: -1, dy: 0 };
    if (dy > 0 && Math.abs(dx) < Math.abs(dy) && gameBoard[x][y + 1] == 0) return { dx: 0, dy: 1 };
    if (dy < 0 && Math.abs(dx) < Math.abs(dy) && gameBoard[x][y - 1] == 0) return { dx: 0, dy: -1 };
    if (gameBoard[x + 1][y] == 0) return { dx: 1, dy: 0 };
    if (gameBoard[x - 1][y] == 0) return { dx: -1, dy: 0 };
    if (gameBoard[x][y + 1] == 0) return { dx: 0, dy: 1 };
    if (gameBoard[x][y - 1] == 0) return { dx: 0, dy: -1 };
    return { dx: me.dx, dy: me.dy };
}

var competitors = {
    team1: {
        name: "Power hunter",
        func: powerHunterFunc,
        color: "pink"
    },
    team2: {
        name: "Always right",
        func: rightFunc,
        color: "purple"
    },
    team3: {
        name: "Bully",
        func: bullyFunc,
        color: "green"
    },
    team4: {
        name: "Always left",
        func: leftFunc,
        color: "orange"
    },
    team5: {
        name: "Random",
        func: randomFunc,
        color: "#d39"
    },
}

setUpSelectPlayer(nrOfPlayers);