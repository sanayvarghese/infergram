import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { Chance } from "chance";
import data from "./data.json" assert { type: "json" };
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import ShortUniqueId from "short-unique-id";
import leven from "leven";
import {
  uniqueNamesGenerator,
  NumberDictionary,
  animals,
  colors,
} from "unique-names-generator";
import client from "prom-client";

dotenv.config();

interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  color: string;
}

interface Room {
  id: string;
  host: string;
  skipVotes: Set<string>;
  players: Map<string, Player>;
  settings: {
    numberOfRounds: number;
    roundDuration: number;
  };
  isEndingRound: boolean;
  currentRound: number;
  currentWord: string;
  guessedLetters: Set<string>;
  roundTimer: NodeJS.Timeout | null;
  roundEndTime: number;
}

const rooms = new Map<string, Room>();

const chance = new Chance();
const numberDictionary = NumberDictionary.generate({ min: 100, max: 999 });
const { randomUUID } = new ShortUniqueId({ length: 7 });
const CONNECTION_TIMEOUT = 60 * 1000 * 15; // 15 minute

// Server
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

const registry = new client.Registry();
const activeConnectionsGauge = new client.Gauge({
  name: "active_connections",
  help: "Number of active WebSocket connections",
});
registry.registerMetric(activeConnectionsGauge);

// Add this at the end of your server file
const gracefulShutdown = () => {
  console.log("Gracefully shutting down server...");

  // Close all active WebSocket connections
  for (const [, room] of rooms) {
    room.players.forEach((player) => {
      io.to(player.id).emit(
        "error",
        "The server is shutting down...Please try later!"
      );
    });
  }

  // Wait for 5 seconds to allow connections to close
  setTimeout(() => {
    console.log("Server shutdown complete.");
    process.exit(0);
  }, 5000);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

function fileToGenerativePart(path: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function runGemini(id: string, description: string) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction:
        'Analyze the image and give a discription for that image. Make the response shorter and in simpler words that are used commonly. DONT INCLUDE COMMAS OR ANY OTHER SYMBOLS. Make the description in 4 to 8 words. With the image the user also will gave a sample discription. Make our response similar to that. The given discription can contain words like "ariel photography of" or like "...long angle..." like that words descibring the image capturing technique, Dont include that words in our response. ',
    });

    const prompt = description;
    const images = [
      fileToGenerativePart(`compressed/${id}.jpeg`, "image/jpeg"),
    ];
    const result = await model.generateContent([prompt, ...images]);
    const resp = await result.response;
    const text = resp.text();
    return text;
  } catch (e) {
    console.log(e);

    throw "Cannot Genreate Description";
  }
}

function cleanString(str: string) {
  // Use a regular expression to replace all characters that are not a-z, A-Z, or space with an empty string
  return str.replace(/[^a-zA-Z ]/g, "");
}

async function generateRandomData() {
  try {
    const image = chance.pickone(data["data"]);
    const ai_descirption = await runGemini(image["id"], image["description"]);
    // console.log(ai_descirption);
    return {
      id: image["id"],
      imageUrl: image["url"],
      text: ai_descirption,
    };
  } catch {
    throw "Cannot Generate Description.";
  }
}

// Add this after the 'connection' event handler

io.use((socket, next) => {
  let disconnectTimer: NodeJS.Timeout | null = null;

  const clearDisconnectTimer = () => {
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }
  };

  const setDisconnectTimer = () => {
    clearDisconnectTimer();
    disconnectTimer = setTimeout(() => {
      socket.disconnect(true);
    }, CONNECTION_TIMEOUT);
  };

  socket.on("activity", () => {
    setDisconnectTimer();
  });

  socket.on("disconnect", () => {
    clearDisconnectTimer();
  });

  setDisconnectTimer();
  next();
});

io.on("connection", (socket: Socket) => {
  activeConnectionsGauge.inc();
  // console.log(socket.id, "joined");

  socket.on("createRoom", ({ username, settings, color }) => {
    if (!username) {
      username = uniqueNamesGenerator({
        dictionaries: [colors, animals, numberDictionary],
        length: 2,
        separator: "",
        style: "capital",
      });
    }
    const roomId = randomUUID();
    const player: Player = {
      isHost: true,
      id: socket.id,
      name: username,
      score: 0,
      color,
    };
    const room: Room = {
      id: roomId,
      host: socket.id,
      skipVotes: new Set(),
      players: new Map([[socket.id, player]]),
      settings,
      isEndingRound: false,
      currentRound: 0,
      currentWord: "",
      guessedLetters: new Set(),
      roundTimer: null,
      roundEndTime: 0,
    };
    rooms.set(roomId, room);

    socket.join(roomId);
    socket.emit("roomCreated", { roomId, isHost: true });
    io.to(roomId).emit("playerList", Array.from(room.players.values()));
  });

  socket.on("joinRoom", ({ roomId, username, color }) => {
    if (!username) {
      username = uniqueNamesGenerator({
        dictionaries: [colors, animals, numberDictionary],
        length: 2,
        separator: "",
        style: "capital",
      });
    }
    const room = rooms.get(roomId);

    if (room) {
      const player: Player = {
        isHost: false,
        id: socket.id,
        name: username,
        score: 0,
        color,
      };
      room.players.set(socket.id, player);
      socket.join(roomId);
      socket.emit("joinedRoom", { roomId, isHost: false });
      io.to(roomId).emit("skipVoteUpdate", {
        skipVotes: room.skipVotes.size,
        totalPlayers: room.players.size,
      });
      io.to(roomId).emit("message", {
        type: "success",
        message: `${player.name} Joined the room.`,
      });
      io.to(roomId).emit("playerList", Array.from(room.players.values()));
    } else {
      socket.emit("error", "Room not found");
    }
  });

  socket.on("startGame", (roomId: string) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.host) {
      io.to(roomId).emit("loading");

      startRound(roomId);
    }
  });

  socket.on("changeSettings", ({ rounds, roundDuration, roomCode }) => {
    const room = rooms.get(roomCode);
    if (room && socket.id === room.host) {
      room.settings.roundDuration = roundDuration;
      room.settings.numberOfRounds = rounds;
      io.to(roomCode).emit("settingUpdated", { rounds, roundDuration });
    } else {
      socket.emit("error", "Only host can change settings");
    }
  });

  socket.on("skipVote", (roomId: string) => {
    const room = rooms.get(roomId);
    if (room && room.currentRound > 0) {
      room.skipVotes.add(socket.id);
      const skipPercentage = (room.skipVotes.size / room.players.size) * 100;
      io.to(roomId).emit("skipVoteUpdate", {
        skipVotes: room.skipVotes.size,
        totalPlayers: room.players.size,
      });
      const player = room.players.get(socket.id);
      if (player) {
        io.to(roomId).emit("message", {
          type: "warning",
          message: `${player.name} Requested for skip (${
            room.skipVotes.size
          }/${Math.ceil(room.players.size * 0.75)})`,
        });
      }

      if (skipPercentage >= 75) {
        // Clear the current round timer
        if (room.roundTimer) clearTimeout(room.roundTimer);

        // Reset skip votes
        room.skipVotes.clear();
        io.to(roomId).emit("loading");

        // Generate new round data without incrementing the round
        startRound(roomId, true);
      }
    }
  });

  socket.on("guess", ({ roomId, guess }) => {
    const room = rooms.get(roomId);
    if (room && room.currentRound > 0 && !room.isEndingRound) {
      const player = room.players.get(socket.id);
      if (player) {
        io.to(roomId).emit("message", {
          type: null,
          message: `${player.name}: ${guess}`,
        });
        let closeGuesses: string[] = [];
        const words = cleanString(room.currentWord).toLowerCase().split(/\s+/);
        const guessedWords = cleanString(guess).toLowerCase().split(/\s+/);
        let correctGuesses: string[] = [];

        guessedWords.forEach((guessedWord: string) => {
          words.forEach((word) => {
            var distance = leven(guessedWord, word);

            if (
              distance < 3 &&
              distance != 0 &&
              word != " " &&
              guessedWord != " "
            ) {
              closeGuesses.push(guessedWord);
            }
          });

          if (words.includes(guessedWord)) {
            correctGuesses.push(guessedWord);
          }
        });
        closeGuesses = Array.from(new Set(closeGuesses));
        closeGuesses = closeGuesses.filter((a) => !correctGuesses.includes(a));

        if (correctGuesses.length > 0) {
          io.to(roomId).emit("message", {
            type: "success",
            message: `${player.name}: ${correctGuesses.join(",")} are correct!`,
          });
          const hiddenWords = hideText(room.currentWord).split(" ");
          words.forEach((word, index) => {
            if (
              correctGuesses.includes(word.toLowerCase()) ||
              room.guessedLetters.has(word)
            ) {
              hiddenWords[index] = word;
            }
          });

          const updatedHiddenText = hiddenWords.join(" ");
          const timeRemaining = Math.ceil(
            (room.roundEndTime - Date.now()) / 1000
          );
          const scoreGained = correctGuesses.length * timeRemaining;

          player.score += scoreGained;
          room.guessedLetters = new Set([
            ...room.guessedLetters,
            ...correctGuesses,
          ]);

          // Check if all words are guessed

          const allWordsGuessed = !updatedHiddenText.includes("_");
          // if (allWordsGuessed) {
          //   player.hasGuessed = true;
          // }

          io.to(roomId).emit("guessResult", {
            playerId: socket.id,
            playerName: player.name,
            correctWords: correctGuesses,
            updatedHiddenText: updatedHiddenText,
            closeGuesses: closeGuesses,
            scoreGained: scoreGained,
            allWordsGuessed: allWordsGuessed,
          });

          io.to(roomId).emit("playerList", Array.from(room.players.values()));

          if (allWordsGuessed) {
            if (room.roundTimer) clearTimeout(room.roundTimer);
            endRound(roomId);
          }
        } else {
          socket.emit("guessResult", {
            correct: false,
            message: "No correct guesses.",
          });
        }
        if (closeGuesses.length > 0) {
          io.to(roomId).emit("message", {
            type: "warning",
            message: `${player.name}: ${closeGuesses.join(",")} are close!`,
          });
        }
      }
    }
  });

  socket.on("disconnect", () => {
    activeConnectionsGauge.dec();
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        if (room.host === socket.id && room.players.size > 0) {
          const newHost = room.players.keys().next().value;
          room.host = newHost;
          const newHostPlayer = room.players.get(newHost);
          if (newHostPlayer) {
            newHostPlayer.isHost = true;
            room.players.set(newHost, newHostPlayer);
          }
          // room.players.set(newHost,(prev:Player)=> {...prev, } )
          io.to(roomId).emit("newHost", { hostId: newHost });
        }
        if (room.players.size === 0) {
          if (room.roundTimer) clearTimeout(room.roundTimer);
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit("playerLeft", { playerId: socket.id });
          io.to(roomId).emit("skipVoteUpdate", {
            skipVotes: room.skipVotes.size,
            totalPlayers: room.players.size,
          });
          io.to(roomId).emit("playerList", Array.from(room.players.values()));
        }
      }
    }
  });
});

// Expose Prometheus metrics
app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", registry.contentType);
  res.send(await registry.metrics());
});

function hideText(text: string): string {
  return text.replace(/[a-zA-Z]/g, "_");
}
async function startRound(roomId: string, skipRound: boolean = false) {
  const room = rooms.get(roomId);
  if (room) {
    room.isEndingRound = false;
    if (!skipRound) {
      room.currentRound++;
    }
    room.guessedLetters.clear();
    // room.players.forEach((player) => (player.hasGuessed = false));
    room.skipVotes.clear();
    io.to(roomId).emit("skipVoteUpdate", {
      skipVotes: room.skipVotes.size,
      totalPlayers: room.players.size,
    });

    try {
      const { imageUrl, id, text } = await generateRandomData();
      room.currentWord = text.toLowerCase();
      const hiddenText = text
        .split(" ")
        .map((word) => "_".repeat(word.length))
        .join(" ");

      const serverTime = Date.now();
      room.roundEndTime = serverTime + room.settings.roundDuration * 1000;

      io.to(roomId).emit("roundStart", {
        round: room.currentRound,
        totalRounds: room.settings.numberOfRounds,
        imageUrl,
        id,
        hiddenText,
        roundDuration: room.settings.roundDuration,
        serverTime: serverTime, // Add this line
      });

      room.roundTimer = setTimeout(
        () => endRound(roomId),
        room.settings.roundDuration * 1000
      );
    } catch (error) {
      console.error("Error generating round data:", error);
      io.to(roomId).emit("error", "Failed to start round");
    }
  }
}

function endRound(roomId: string) {
  const room = rooms.get(roomId);
  if (room && !room.isEndingRound) {
    room.isEndingRound = true;
    io.to(roomId).emit("roundEnd", {
      word: room.currentWord,
      scores: Array.from(room.players.values()),
    });
    io.to(roomId).emit("message", {
      type: "success",
      message: `Round ${room.currentRound}/${room.settings.numberOfRounds} Ended!`,
    });

    if (room.currentRound < room.settings.numberOfRounds) {
      setTimeout(() => io.to(roomId).emit("loading"), 5000);
      setTimeout(() => {
        startRound(roomId);
      }, 5000);
    } else {
      setTimeout(() => endGame(roomId), 2000);
    }
  }
}

function endGame(roomId: string) {
  const room = rooms.get(roomId);
  if (room) {
    const finalScores = Array.from(room.players.values()).sort(
      (a, b) => b.score - a.score
    );

    io.to(roomId).emit("gameEnd", { finalScores });
    room.currentRound = 0;
    room.currentWord = "";
    room.guessedLetters = new Set();
    room.roundTimer = null;
    room.roundEndTime = 0;
    room.players.forEach((player) => {
      // player.hasGuessed = false;
      player.score = 0;
    });
  }
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
