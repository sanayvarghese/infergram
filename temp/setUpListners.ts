import { Server } from "socket.io";
import { Game } from "./game";

const rooms = new Map<string, Game>();

export function setUpListners(io: Server) {
  io.on("connection", (socket) => {
    console.log(`New connection from ${socket.id}`);

    socket.on("join-room", (roomId: string, name: string) => {
      if (!roomId) return socket.emit("error", "Invalid room ID");
      if (!name) return socket.emit("error", "Please provide nickname.");

      socket.join(roomId);

      if (rooms.has(roomId)) {
        const game = rooms.get(roomId);
        if (!game) return socket.emit("error", "Game not found");
        game.joinGame(socket.id, name, socket);
      } else {
        const game = new Game(roomId, io, socket.id);
        rooms.set(roomId, game);
        game.joinGame(socket.id, name, socket);
      }
    });
  });
}
