import { Server, Socket } from "socket.io";
import { getImage } from "./utils/generateTask";

export class Game {
  gameStatus: "not-started" | "started" | "finished";
  gameId: string;
  players: { id: string; score: number; name: string; guessedFlag: boolean }[];
  io: Server;
  currentRound: number;
  gameHost: string;
  gameSettings: {
    rounds: number;
    roundTimeInSeconds: number;
    language: string;
    maxPlayers: number;
  };
  imageDetails: {};

  constructor(id: string, io: Server, host: string) {
    this.gameId = id;
    this.io = io;
    this.currentRound = 0;
    this.gameHost = host;
    this.imageDetails = {};
    this.players = [];
    this.gameStatus = "not-started";
    this.gameSettings = {
      rounds: 8,
      roundTimeInSeconds: 80,
      language: "en",
      maxPlayers: 10,
    };
  }

  setUpListners(socket: Socket) {
    socket.on("start-game", async () => {
      if (this.gameStatus === "started")
        return socket.emit("error", "The game has already started");
      if (this.gameHost !== socket.id)
        return socket.emit("error", "Only host can start the game.");

      for (const player of this.players) {
        player.score = 0;
        player.guessedFlag = false;
      }
      this.currentRound = 1;

      this.io.to(this.gameId).emit("players", this.players);

      this.gameStatus = "started";

      const imageDetails = getImage();

      this.imageDetails = imageDetails;
      this.io.to(this.gameId).emit("round-begun", {
        roundDuration: this.gameSettings.roundTimeInSeconds,
        imageDetails,
      });
    });
  }

  joinGame(id: string, name: string, socket: Socket) {
    if (this.gameStatus === "started")
      return socket.emit(
        "error",
        "Game has already started, please wait it to end before joining!"
      );

    this.players.push({ id, name, score: 0, guessedFlag: false });
    this.io.to(this.gameId).emit("player-joined", {
      id,
      name,
      score: 0,
    });

    socket.emit("player", this.players);
    socket.emit("new-host", this.gameHost);

    this.setUpListners(socket);
  }
}
