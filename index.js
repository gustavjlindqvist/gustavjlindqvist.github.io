const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const gameClientServer = new Server(server);

//import { resetGame, startGame, setUpSelectPlayer, setSpeed } from './public/src/game.js'

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

gameClientServer.on('connection', (socket) => {
    console.log('game connected');

    socket.on('resetGame', () => {
        console.log('reset game')
    })

    socket.on('startGame', () => {
        console.log('start game')
    })

    socket.on('selectNumberOfPlayers', (data) => {
        console.log('select number of players')
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