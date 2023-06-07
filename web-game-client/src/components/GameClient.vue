<script setup lang="ts">
import { ref } from "vue";
import { io } from "socket.io-client";
import { getPlayerId, getPlayerMove } from "../game/game";

const name = ref("");
const host = ref("http://localhost:3000");

function connectToGame() {
  const currentName = name.value;
  const socket = io(`${host.value}/gameClient`);
  socket.emit("playerJoined", [{ name: name.value }]);

  socket.on("clientMove", (gameState: GameState, respond) => {
    const playerId = getPlayerId(gameState, currentName);
    const response = {
      name: currentName,
      ...getPlayerMove(gameState, playerId),
    };
    respond(response);
  });
}
</script>

<template>
  <div class="container">
    <h1>Snake game web client</h1>
    <form @submit.prevent="connectToGame" class="container">
      <div class="input-container">
        <label for="host">Host</label>
        <input type="text" v-model="host" id="host" />
      </div>
      <div class="input-container">
        <label for="name">Name</label>
        <input type="text" v-model="name" id="name" />
      </div>

      <button type="submit">Connect to game</button>
    </form>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.input-container {
  display: flex;
  gap: 0.5rem;
}
</style>
