import { allPowerups } from "./powerups.js";

var timer, simulationSpeed = 100;
var nrOfPlayers = 2, startPositions = [], players = [];
const maxY = 40;
const maxX = 40;

function initBoard() {
    $("#board").html("");
    let board = document.getElementById("board");
    let tbl = document.createElement("table");
    tbl.setAttribute("id", "gameboard");
    for (let y=1; y<=maxY; y++)
    {
        let row = document.createElement("tr");
        for (let x=1; x<=maxX; x++)
        {
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
initBoard();

export function setSpeed(value) {
    simulationSpeed = 1000/value;
}

export function setUpSelectPlayer(num) {
    nrOfPlayers = num
    for (let i=1; i<=6; i++) {
        $("#player" + i).html("");
        if (i <= nrOfPlayers) {
            for (let c in competitors) {
                $(".player" + i).show();
                let option = document.createElement("option");
                option.setAttribute("value", c);
                option.innerHTML = competitors[c].name;
                document.getElementById("player" + i).appendChild(option);
            }
        }
        else {
            $(".player" + i).hide();
        }
    }
}


export function resetGame() {
    clearTimeout(timer);
    startPositions = [];
    for (let i=0; i<nrOfPlayers; i++) {
        let x = Math.floor(Math.random()*maxX) + 1;
        let y = Math.floor(Math.random()*maxY) + 1;
        if (startPositions.includes(x*1000 + y)) i--;
        else startPositions[i] = x*1000 + y;
    }
    
    players = [];
    for (let i=1; i<=nrOfPlayers; i++) {
        players[i-1] = competitors[$("#player" + i).find(":selected").val()];
    }
    
    $(".box").attr("style", "");
    $(".box").attr("class", "box");
    for (let i=0; i<nrOfPlayers; i++) {
        let y = startPositions[i] % 1000;
        let x = Math.round((startPositions[i]-y)/1000);
        let color = players[i].color;
        $("#x"+x + "y" + y).attr("style", "--color:" +color);
        $("#x"+x + "y" + y).addClass("head").addClass("headUp");
    }
    $("#startBtn").show();
    $("#result").css("color", "white");
    $("#result").html("");
    for (let i=0; i<nrOfPlayers; i++) {
        let vs = " vs ";
        if (i == 0) vs = "";
        $("#result").append(vs + "<span style='color: "+players[i].color+"'>" + players[i].name + "</span>");
    }
}

export function startGame() {
    $("#startBtn").hide();
    clearTimeout(timer);
    let gameBoard = [];
    for (let x=0; x<=maxX+1; x++)
    {
        gameBoard[x] = [];
        for (let y=0; y<=maxY+1; y++)
        {
            gameBoard[x][y] = 0;
            if (x == 0 || x == maxX+1 || y == 0 || y == maxY+1)
                gameBoard[x][y] = -1;
        }
    }
    let playerState = [];
    let playerIsAlive = [];
    for (let i=0; i<nrOfPlayers; i++) {
        let y = startPositions[i] % 1000;
        let x = Math.round((startPositions[i]-y)/1000);
        
        playerState[i] = {x: x, y: y, dx: 0, dy: -1, activePower: {name: null, step: 0}};
        playerIsAlive[i] = true;
        
        gameBoard[x][y] = i+2; // the player number stored in the gameboard
    }
    gameLoop(0, gameBoard, players, playerState, playerIsAlive, nrOfPlayers, false, null);
}

function getGameBoardCopy(gameBoard, player) {
    let gameBoardCopy = JSON.parse(JSON.stringify(gameBoard));
    let playerNr = player + 2;
    for (let x=1; x<=maxX; x++)
    {
        for (let y=1; y<=maxY; y++)
        {
            if (gameBoardCopy[x][y] == playerNr) {
                gameBoardCopy[x][y] = 1;
            }
        }
    }
    return gameBoardCopy;
}

function gameLoop(step, gameBoard, players, playerState, playerIsAlive, nrOfPlayers, gameOver, boardPower) {
    
    // save copy for later
    let lastPlayerState = JSON.parse(JSON.stringify(playerState));

    // Check for powerup expiry
    for (let i=0; i<nrOfPlayers; i++) {
        if (playerState[i].activePower.name) {
            const stepsSinceActive = step - (playerState[i].activePower.step)
            if (stepsSinceActive > 5) {
                console.log("Player", i, "expired power up", playerState[i].activePower.name);
                playerState[i].activePower = {name: null, step: step}
            }
        }
    }

    // Ask clients for their move {dx: _, dy: _}
    for (let i=0; i<nrOfPlayers; i++) {

        if (playerIsAlive[i]) {
            
            let gameBoardCopy = getGameBoardCopy(gameBoard, i);
            
            let playerStateCopy = JSON.parse(JSON.stringify(playerState));
            let otherPlayersState = {};
            let myState;
            for (let p=0; p<nrOfPlayers; p++) {
                if (p == i) {
                    myState = playerStateCopy[p];
                } else {
                    let playerNr = p + 2;
                    otherPlayersState[playerNr] = playerStateCopy[p];
                }
            }
            
            let move = players[i].func(myState, playerStateCopy, gameBoardCopy);
            playerState[i].dx = move.dx;
            playerState[i].dy = move.dy;
        }
    }
    
    // Move players according to their selected move.
    for (let i=0; i<nrOfPlayers; i++) {
        if (playerIsAlive[i] && playerState[i].activePower.name != "frozen") {
            let validMove = false;
            let dx = playerState[i].dx;
            let dy = playerState[i].dy;
            
            if (dx == -1 && dy == 0 ||
                dx == 1  && dy == 0 ||
                dx == 0  && dy == 1 ||
                dx == 0  && dy == -1) {
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
                console.log("Dead no valid move");
                playerIsAlive[i] = false;
            }
        }
    }
    
    // Check if any player finds a powerup
    for (let i=0; i<nrOfPlayers; i++) {
        const playerX = playerState[i].x;
        const playerY = playerState[i].y;

        if (boardPower) {
            if (gameBoard[playerX][playerY] == boardPower.id) {

                // Player found a powerup
                console.log("Player", i, "found", boardPower.name, gameBoard[playerX][playerY], playerX, playerY);
                playerState[i].activePower = {name:boardPower.name, step:step};
                gameBoard[playerX][playerY] = i;
                boardPower = null;
            }
        }       
    }

    // Check if player crashes into other players or wall
    for (let i=0; i<nrOfPlayers; i++) {
        const playerX = playerState[i].x;
        const playerY = playerState[i].y;

        if (playerIsAlive[i] && playerState[i].activePower.name != "frozen") {
            // Wall
            if (gameBoard[playerX][playerY] != 0) {
                console.log("Player", i, "killed", gameBoard[playerX][playerY], playerX, playerY);
                playerIsAlive[i] = false;
            }
        }

        // Other players
        for (let j=i+1; j<nrOfPlayers; j++) {
            if (playerX == playerState[j].x && playerY == playerState[j].y) {
                playerIsAlive[i] = false;
                playerIsAlive[j] = false;
                $("#x"+playerX + "y" + playerY).css("background", "#aaaaaa");
            }
        }
    }
    
    // Check for a winner
    if (playerIsAlive.includes(false)) {
        let nrOfPlayersAlive = 0;
        let winner = 0;
        for (let i=0; i<nrOfPlayers; i++) {
            if (playerIsAlive[i]) {
                nrOfPlayersAlive++;
                winner = i;
            }
        }
        if (nrOfPlayersAlive == 1) {
            $("#result").html(players[winner].name + " wins!!!");
            $("#result").css("color", players[winner].color);
            gameOver = true;
        }
        if (nrOfPlayersAlive == 0) {
            return;
        }
    }
    
    // Update game board with new player head
    for (let i=0; i<nrOfPlayers; i++) {
        if (playerIsAlive[i]) {
            let x = playerState[i].x;
            let y = playerState[i].y;
            let dx = playerState[i].dx;
            let dy = playerState[i].dy;
            let color = players[i].color;
            let lastX = lastPlayerState[i].x;
            let lastY = lastPlayerState[i].y;
            let lastDx = lastPlayerState[i].dx;
            let lastDy = lastPlayerState[i].dy;
            gameBoard[x][y] = i+2;
            
            $("#x"+x + "y" + y).attr("style", "--color: " + color);
            $("#x"+x + "y" + y).addClass("head");
            if (dx == 1 && dy == 0) {
                $("#x"+x + "y" + y).addClass("headRight");
            } else if (dx == -1 && dy == 0) {
                $("#x"+x + "y" + y).addClass("headLeft");
            } else if (dx == 0 && dy == 1) {
                $("#x"+x + "y" + y).addClass("headDown");
            } else if (dx == 0 && dy == -1) {
                $("#x"+x + "y" + y).addClass("headUp");
            }
            
            $("#x"+lastX + "y" + lastY).removeClass("head").removeClass("headRight").removeClass("headLeft").removeClass("headDown").removeClass("headUp");
            if (dy == 0 && lastDy == 0) {
                $("#x"+lastX + "y" + lastY).addClass("horizontal");
            }
            else if (dx == 0 && lastDx == 0) {
                $("#x"+lastX + "y" + lastY).addClass("vertical");
            }
            else if (dx == 1 && dy == 0 && lastDx == 0 && lastDy == 1 ||
                     dx == 0 && dy == -1 && lastDx == -1 && lastDy == 0) {
                $("#x"+lastX + "y" + lastY).addClass("downLeft");
            }
            else if (dx == 1 && dy == 0 && lastDx == 0 && lastDy == -1 || 
                     dx == 0 && dy == 1 && lastDx == -1 && lastDy == 0) {
                $("#x"+lastX + "y" + lastY).addClass("downRight");
            }
            else if (dx == -1 && dy == 0 && lastDx == 0 && lastDy == -1 ||
                     dx == 0 && dy == 1 && lastDx == 1 && lastDy == 0) {
                $("#x"+lastX + "y" + lastY).addClass("upRight");
            }
            else if (dx == -1 && dy == 0 && lastDx == 0 && lastDy == 1 ||
                     dx == 0 && dy == -1 && lastDx == 1 && lastDy == 0) {
                $("#x"+lastX + "y" + lastY).addClass("upLeft");
            }
        }
    }
    
    // Add powerup to board if needed
    if (!boardPower) {

        // For test, just get a position that's conveniently in player 0's path
        // TODO: choose random available square
        const anyPlayer = playerState[0]
        const powerX = anyPlayer.x + anyPlayer.dx*5
        const powerY = anyPlayer.y + anyPlayer.dy*5

        const chosenPower = allPowerups[0];
        gameBoard[powerX][powerY] = chosenPower.id;
      
        $("#x"+powerX + "y" + powerY).css("background", chosenPower.color); 
        boardPower = chosenPower;
    }
    
    // Run next loop
    timer = setTimeout(function() {
        const newStep = step + 1;
        gameLoop(newStep, gameBoard, players, playerState, playerIsAlive, nrOfPlayers, gameOver, boardPower);
    }, simulationSpeed);
}

function randomFunc(me, otherPlayers, gameBoard) {
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
    
    return {dx: dx, dy: dy};
}

function rightFunc(me, otherPlayers, gameBoard) {
    let dx = 0, dy = 0;
    if (me.dx == 1) // right
        dy = 1;
    else if (me.dy == 1) // down
        dx = -1;
    else if (me.dx == -1) // left
        dy = -1;
    else if (me.dy == -1) // up
        dx = 1;
        
    if (gameBoard[me.x + me.dx][me.y + me.dy] == 0) return {dx: me.dx, dy: me.dy};
    else return {dx: dx, dy: dy};
}

function rightFuncNotAvoidingPowers(me, otherPlayers, gameBoard) {

    const nextSquare = gameBoard[me.x + me.dx][me.y + me.dy]
    const notEmpty = nextSquare != 0;
    const notPowerUp = nextSquare != 100;

    if (notEmpty && notPowerUp) {
        // Better turn!
        let dx = 0, dy = 0;
        if (me.dx == 1) // right
            dy = 1;
        else if (me.dy == 1) // down
            dx = -1;
        else if (me.dx == -1) // left
            dy = -1;
        else if (me.dy == -1) // up
            dx = 1;

        return {dx: dx, dy: dy};
    } else {
        // Can just carry on 
        return {dx: me.dx, dy: me.dy};
    }
}

function leftFunc(me, otherPlayers, gameBoard) {
    let dx = 0, dy = 0;
    if (me.dx == 1) // right
        dy = -1;
    else if (me.dy == -1) // up
        dx = -1;
    else if (me.dx == -1) // left
        dy = 1;
    else if (me.dy == 1) // down
        dx = 1;
        
    if (gameBoard[me.x + me.dx][me.y + me.dy] == 0) return {dx: me.dx, dy: me.dy};
    else return {dx: dx, dy: dy};
}

function bullyFunc(me, otherPlayers, gameBoard) {
    let x = me.x;
    let y = me.y;
    let best = 9999;
    let target = 0;
    for (let p in otherPlayers) {
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
    if (dx > 0 && Math.abs(dx) > Math.abs(dy) && gameBoard[x+1][y] == 0) return {dx: 1, dy: 0};
    if (dx < 0 && Math.abs(dx) > Math.abs(dy) && gameBoard[x-1][y] == 0) return {dx: -1, dy: 0};
    if (dy > 0 && Math.abs(dx) < Math.abs(dy) && gameBoard[x][y+1] == 0) return {dx: 0, dy: 1};
    if (dy < 0 && Math.abs(dx) < Math.abs(dy) && gameBoard[x][y-1] == 0) return {dx: 0, dy: -1};
    if (gameBoard[x+1][y] == 0) return {dx: 1, dy: 0};
    if (gameBoard[x-1][y] == 0) return {dx: -1, dy: 0};
    if (gameBoard[x][y+1] == 0) return {dx: 0, dy: 1};
    if (gameBoard[x][y-1] == 0) return {dx: 0, dy: -1};
    return {dx: me.dx, dy: me.dy};
}

var competitors = {
    team1: {
        name: "Random",
        func: randomFunc,
        color: "#3d9"
    },
    team2: {
        name: "Always right",
        func: rightFunc,
        color: "#d39"
    },
    team3: {
        name: "Bully",
        func: bullyFunc,
        color: "#93d"
    },
    team4: {
        name: "Always left",
        func: leftFunc,
        color: "orange"
    },
    team5: {
        name: "Power hunter",
        func: rightFuncNotAvoidingPowers,
        color: "#d39"
    },
}

setUpSelectPlayer(nrOfPlayers);