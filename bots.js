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

exports.bots = [
    {
        name: "Power hunter",
        func: powerHunterFunc,
    },
    {
        name: "Always right",
        func: rightFunc,
    },
    {
        name: "Bully",
        func: bullyFunc,
    },
    {
        name: "Always left",
        func: leftFunc,
    },
    {
        name: "Random",
        func: randomFunc,
    },
    {
        name: "Random2",
        func: randomFunc,
    }
]