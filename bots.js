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

    return { dx: dx, dy: dy };
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

    if (gameBoard[me.x + me.dx][me.y + me.dy] == 0) return { dx: me.dx, dy: me.dy };
    else return { dx: dx, dy: dy };
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

    if (gameBoard[me.x + me.dx][me.y + me.dy] == 0) return { dx: me.dx, dy: me.dy };
    else return { dx: dx, dy: dy };
}

function bullyFunc(me, otherPlayers, gameBoard) {
    if (otherPlayers.length > 0) {
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
    } else {
        return {
            dx: 1,
            dy: 0
        }
    }
}

function cinnamonRoll(me, otherPlayers, gameBoard) {
    let dx = 0, dy = 0;
    if (me.dx == 1) // right
        dy = 1;
    else if (me.dy == 1) // down
        dx = -1;
    else if (me.dx == -1) // left
        dy = -1;
    else if (me.dy == -1) // up
        dx = 1;

    if (gameBoard[me.x + dx][me.y + dy] == 0) return { dx: dx, dy: dy };
    else if (gameBoard[me.x + me.dx][me.y + me.dy] == 0) return { dx: me.dx, dy: me.dy };
    else return { dx: -dx, dy: -dy };
}

function getBots() {

    var bots = [
        {
            name: "Random",
            func: randomFunc,
        },
        {
            name: "Righty",
            func: rightFunc,
        },
        {
            name: "Lefty",
            func: leftFunc,
        },
        {
            name: "Bully bot",
            func: bullyFunc,
        },
        {
            name: "Cinnamon roll",
            func: cinnamonRoll,
        }
    ];

    return bots;
}

exports.getBots = getBots;