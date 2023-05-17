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

export function initSimulationSpeedSider(speed) {
    console.log(speed)
    document.getElementById("gameSpeed").value = speed
}

export function setUpSelectPlayer(gameState) {
    document.getElementById("selectNrOfPlayers").value = gameState.activePlayers.length

    for (let i = 1; i <= 6; i++) {
        $("#player" + i).html("");
        let playerId = "player" + i
        const selector = document.getElementById(playerId)
        selector.classList.add("activePlayerSelector");
        const playerAtIndex = gameState.activePlayers[i - 1]
        if (playerAtIndex) {
            $(".player" + i).show();
            for (const selectablePlayer of gameState.selectablePlayers) {
                let option = document.createElement("option");
                if (selectablePlayer.name == playerAtIndex.name) {
                    option.selected = true
                }
                option.setAttribute("value", selectablePlayer.name);
                option.innerHTML = selectablePlayer.name;
                selector.appendChild(option);
            }
        } else {
            $(".player" + i).hide();
        }
    }
}

export function initPlayerPositions(gameState) {
    $(".box").attr("style", "");
    $(".box").attr("class", "box");
    for (const player of gameState.activePlayers) {
        let y = player.y;
        let x = player.x;
        let color = player.color;
        $("#x" + x + "y" + y).attr("style", "--color:" + color);
        $("#x" + x + "y" + y).addClass("head").addClass("headUp");
    }
    $("#startBtn").show();
    $("#result").css("color", "white");
    $("#result").html("");
    for (const [index, player] of Object.values(gameState.activePlayers).entries()) {
        let vs = index != 0 ? " vs " : "";
        $("#result").append(vs + playersNameInColor(player));
    }
}

export function drawPlayers(oldGameState, newGameState) {
    // Update game board with new player head
    for (const player of newGameState.activePlayers) {
        if (player.isAlive && !isFrozen(player)) {
            let x = player.x;
            let y = player.y;
            let dx = player.dx;
            let dy = player.dy;
            let color = player.color;

            const oldPlayerState = oldGameState.activePlayers.find(oldPlayer => player.id == oldPlayer.id)
            let lastX = oldPlayerState.x;
            let lastY = oldPlayerState.y;
            let lastDx = oldPlayerState.dx;
            let lastDy = oldPlayerState.dy;

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
    return playerState.activePower ? playerState.activePower.name == "frozen" : false
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