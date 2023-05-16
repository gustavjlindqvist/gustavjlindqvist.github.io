import { allPowerups } from "./powerups.js";

export function initBoard(gameBoard) {
    $("#board").html("");
    let board = document.getElementById("board");
    let tbl = document.createElement("table");
    tbl.setAttribute("id", "gameboard");
    for (let y = 1; y < gameBoard[0].length - 1; y++) {
        let row = document.createElement("tr");
        for (let x = 1; x < gameBoard.length - 1; x++) {
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

export function setUpSelectPlayer(gameState) {
    document.getElementById("selectNrOfPlayers").value = gameState.numberOfPlayers

    for (let i = 1; i <= 6; i++) {
        $("#player" + i).html("");
        let playerId = "player" + i
        if (i <= gameState.numberOfPlayers) {
            for (let c of gameState.selectablePlayers) {
                $(".player" + i).show();
                let option = document.createElement("option");
                option.setAttribute("value", c.name);
                option.innerHTML = c.name;
                document.getElementById(playerId).appendChild(option);
                document.getElementById(playerId).classList.add("activePlayerSelector");
            }
        }
        else {
            $(".player" + i).hide();
            document.getElementById(playerId).classList.remove("activePlayerSelector");
        }
    }
}

export function initPlayerPositions(gameState) {
    console.log(gameState);
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

export function drawPlayers(oldGameState, newGameState) {
    // Update game board with new player head
    for (let i = 0; i < newGameState.nrOfPlayers; i++) {
        if (newGameState.playerIsAlive[i] && !isFrozen(newGameState.playerState[i])) {
            let x = newGameState.playerState[i].x;
            let y = newGameState.playerState[i].y;
            let dx = newGameState.playerState[i].dx;
            let dy = newGameState.playerState[i].dy;
            let color = newGameState.players[i].color;
            let lastX = oldGameState.playerState[i].x;
            let lastY = oldGameState.playerState[i].y;
            let lastDx = oldGameState.playerState[i].dx;
            let lastDy = oldGameState.playerState[i].dy;
            //newGameState.gameBoard[x][y] = i + 2;

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
}

export function drawMessages(gameState) {
    for (let message of gameState.messageBuffer) {
        writeOutput(message)
    }
}

function isFrozen(playerState) {
    return playerState.activePower.name == "frozen"
}

function squareNotEmpty(gameBoard, x, y) {
    return gameBoard[x][y] != 0
}

export function clearOutput() {
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