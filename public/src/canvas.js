export function drawInitialBoard(gameBoard) {
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

export function drawSimulationSpeedValue(speed) {
    // @ts-ignore
    document.getElementById("simulationSpeedSlider").value = speed
}

export function drawPlayerSelectors(gameState) {
    // @ts-ignore
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

export function drawInitialPlayers(gameState) {
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
    for (const player of newGameState.activePlayers) {

        const isFrozen = player.activePower ? player.activePower.name == "frozen" : false
        if (isFrozen || !player.isAlive) {
            continue;
        }
        
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

export function drawMessages(gameState) {
    for (let message of gameState.messageBuffer) {
        const messageBox = document.getElementById("messageBox");
        messageBox.innerHTML += "＞ " + message;
        messageBox.innerHTML += "<br>";
        messageBox.scrollTop = messageBox.scrollHeight;
    }
}

export function drawClearMessages() {
    const messageBox = document.getElementById("messageBox");
    messageBox.innerHTML = "";
}

export function drawPowerUp(oldGameState, newGameState) {
    const oldPowerUp = oldGameState.boardPowerUp;
    const newPowerUp = newGameState.boardPowerUp;

    if (oldPowerUp == null && newPowerUp != null) {
        // PowerUp added to board
        if (newPowerUp.name == "frozen") {
            $("#x" + newPowerUp.x + "y" + newPowerUp.y).addClass("powerup_frozen");
        }
    } else if (oldPowerUp != null && newPowerUp == null) {
        // PowerUp removed from board
        if (oldPowerUp.name == "frozen") {
            $("#x" + oldPowerUp.x + "y" + oldPowerUp.y).removeClass("powerup_frozen");
        }
    }
}

export function drawGameUIEnabled(isDisabled) {
    const startButton = document.querySelector('#startBtn')
    // @ts-ignore
    startButton.disabled = isDisabled

    const nrOfPlayersSelector = document.getElementById("selectNrOfPlayers");
    // @ts-ignore
    nrOfPlayersSelector.disabled = isDisabled

    const playerSelectors = Array.from(document.getElementsByClassName("activePlayerSelector"))
    for (let index in playerSelectors) {
        const playerSelector = playerSelectors[index]
        // @ts-ignore
        playerSelector.disabled = isDisabled
    }
}

function playersNameInColor(player) {
    return "<span style='color: " + player.color + "'>" + player.name + "</span>";
}
