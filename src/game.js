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

function setSpeed(value) {
    simulationSpeed = 1000/value;
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
    
    $(".box").css("background", "");
    for (let i=0; i<nrOfPlayers; i++) {
        let y = startPositions[i] % 1000;
        let x = parseInt((startPositions[i]-y)/1000);
        let color = players[i].color;
        $("#x"+x + "y" + y).css("background", color);
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
        let x = parseInt((startPositions[i]-y)/1000);
        
        playerState[i] = {x: x, y: y, dx: 0, dy: -1, power: ""};
        playerIsAlive[i] = true;
        
        gameBoard[x][y] = i+2; // the player number stored in the gameboard
    }
    gameLoop(gameBoard, players, playerState, playerIsAlive, nrOfPlayers, false);
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

function gameLoop(gameBoard, players, playerState, playerIsAlive, nrOfPlayers, gameOver) {
    
    // Ask clients for their move {dx: _, dy: _}
    for (let i=0; i<nrOfPlayers; i++) {
        if (playerIsAlive[i] && playerState[i].power != "frozen") {
            
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
        if (playerIsAlive[i]) {
            let validMove = false;
            let dx = playerState[i].dx;
            let dy = playerState[i].dy;
            
            if (dx == -1 && dy == 0 ||
                dx == 1  && dy == 0 ||
                dx == 0  && dy == 1 ||
                dx == 0  && dy == -1) {
                validMove = true;
            }
            
            if (playerState[i].power == "diagonal") {
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
                playerIsAlive[i] = false;
            }
        }
    }
    
    // Check if player craches into other players or wall
    for (let i=0; i<nrOfPlayers; i++) {
        if (gameBoard[playerState[i].x][playerState[i].y] != 0)
            playerIsAlive[i] = false;
        
        for (let j=i+1; j<nrOfPlayers; j++) {
            if (playerState[i].x == playerState[j].x && playerState[i].y == playerState[j].y) {
                playerIsAlive[i] = false;
                playerIsAlive[j] = false;
                $("#x"+playerState[i].x + "y" + playerState[i].y).css("background", "#aaaaaa");
            }
        }
    }
    
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
    
    for (let i=0; i<nrOfPlayers; i++) {
        let x = playerState[i].x;
        let y = playerState[i].y;
        let color = players[i].color;
        gameBoard[x][y] = i+2;
        $("#x"+x + "y" + y).css("background", color);
    }
    
    timer = setTimeout(function() {
        gameLoop(gameBoard, players, playerState, playerIsAlive, nrOfPlayers, gameOver);
    }, simulationSpeed);
}

function randomFunc(me, otherPlayers, gameBoard) {
    let dx, dy;
    let maxIterations = 20;
    do {
        random = Math.random();
    
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
    }
}

function setUpSelectPlayer() {
    nrOfPlayers = parseInt($("#selectNrOfPlayers").find(":selected").val());
    for (let i=1; i<=6; i++) {
        $("#player" + i).html("");
        if (i <= nrOfPlayers) {
            for (c in competitors) {
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
setUpSelectPlayer();
