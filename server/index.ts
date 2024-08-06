import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { Chance } from "chance";
import data from "./data.json";
const chance = new Chance();

import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
dotenv.config();

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
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction:
      'Analyze the image and give a discription for that image. Make the response shorter and in simpler words that are used commonly. DONT INCLUDE COMMAS SO ANY OTHER SYMBOLS. Make the description in 4 to 8 words. With the image the user also will gave a sample discription. Make our response similar to that. The given discription can contain words like "ariel photography of" or like "...long angle..." like that words descibring the image capturing technique, Dont include that words in our response. ',
  });

  const prompt = description;
  const images = [fileToGenerativePart(`compressed/${id}.jpeg`, "image/jpeg")];
  const result = await model.generateContent([prompt, ...images]);
  const resp = await result.response;
  const text = resp.text();
  return text;
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["POST", "GET"],
  },
});

const PORT = process.env.PORT || 3000;

// Types
interface GameSettings {
  rounds: number;
  roundDuration: number;
}
interface Player {
  id: string;
  username: string;
  score: number;
  requestedSkip: boolean;
  isHost: boolean;
  hiddenText: string;
}

interface GameRoom {
  hostId: string;
  players: Player[];
  settings: GameSettings;
  currentRound: number;
  roundData: RoundData | null;
  roundEndTime?: number;
  skipRequests: number;
  isLoading: boolean;
}

interface RoundData {
  id: string;
  url: string;
  text: string;
}

interface GuessResult {
  correctWords?: string[];
  remainingWords?: string;
  scoreGained?: number;
  message?: string;
}
function cleanString(str: string) {
  // Use a regular expression to replace all characters that are not a-z, A-Z, or space with an empty string
  return str.replace(/[^a-zA-Z ]/g, "");
}
// Game rooms and settings
const gameRooms: Map<string, GameRoom> = new Map();

// Helper function to generate a random room code
function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function getRandomImageAndText(): Promise<RoundData> {
  const image = chance.pickone(data["data"]);
  console.log(image);
  const ai_descirption = await runGemini(image["id"], image["description"]);
  console.log(ai_descirption);

  return {
    id: image["id"],
    url: image["url"],
    text: ai_descirption,
  };
}

// Helper function to hide text

function hideText(text: string): string {
  return text.replace(/[a-zA-Z]/g, "_");
}
io.on("connection", (socket: Socket) => {
  console.log("A user connected");

  socket.on(
    "createRoom",
    ({ settings, username }: { settings: GameSettings; username: string }) => {
      const roomCode = generateRoomCode();
      const hostId = socket.id;
      console.log(hostId);

      const player = {
        username: username,
        id: socket.id,
        score: 0,
        requestedSkip: false,
        isHost: true,
        hiddenText: "",
      };
      gameRooms.set(roomCode, {
        hostId: hostId,
        players: [player],
        settings: settings,
        currentRound: 0,
        skipRequests: 0,
        roundData: null,
        isLoading: false,
      });
      socket.emit("roomCreated", { roomCode, id: socket.id });
    }
  );

  socket.on(
    "joinRoom",
    ({ username, roomCode }: { roomCode: string; username: string }) => {
      if (gameRooms.has(roomCode)) {
        const room = gameRooms.get(roomCode)!;
        var isHost = false;
        if (room.players.length == 0) isHost = true;
        const player = {
          username: username,
          id: socket.id,
          score: 0,
          requestedSkip: false,
          isHost: isHost,
          hiddenText: "",
        };
        room.players.push(player);
        socket.join(roomCode);
        io.to(roomCode).emit("playerJoined", {
          username: player.username,
          id: player.id,
          score: player.score,
          host: isHost,
        });
      } else {
        socket.emit("error", "Room not found");
      }
    }
  );

  socket.on("startGame", (roomCode: string) => {
    console.log("started");
    if (gameRooms.has(roomCode)) {
      const room = gameRooms.get(roomCode)!;
      if (room.hostId === socket.id) {
        startRound(roomCode);
      }
    }
  });

  socket.on("guess", (roomCode: string, guess: string) => {
    if (gameRooms.has(roomCode)) {
      const room = gameRooms.get(roomCode)!;
      const player = room.players.find((p) => p.id === socket.id);
      if (player && room.roundData) {
        const words = cleanString(room.roundData.text)
          .toLowerCase()
          .split(/\s+/);
        const guessedWords = guess.toLowerCase().split(/\s+/);
        let correctGuesses: string[] = [];

        guessedWords.forEach((guessedWord) => {
          if (words.includes(guessedWord)) {
            correctGuesses.push(guessedWord);
          }
        });

        if (correctGuesses.length > 0) {
          const hiddenWords = player.hiddenText.split(" ");
          words.forEach((word, index) => {
            if (correctGuesses.includes(word.toLowerCase())) {
              hiddenWords[index] = word;
            }
          });
          player.hiddenText = hiddenWords.join(" ");

          const timeRemaining = (room.roundEndTime || 0) - Date.now();
          const scoreGained =
            correctGuesses.length * Math.ceil(timeRemaining / 1000);
          player.score += scoreGained;

          socket.emit("guessResult", {
            correctWords: correctGuesses,
            updatedHiddenText: player.hiddenText,
            scoreGained: scoreGained,
            message: "Correct guess!",
          } as GuessResult);

          if (!player.hiddenText.includes("_")) {
            endRound(roomCode);
          }
        } else {
          socket.emit("guessResult", {
            message: "No correct guesses",
          } as GuessResult);
        }
      }
    }
  });
  socket.on("requestSkip", (roomCode: string) => {
    if (gameRooms.has(roomCode)) {
      const room = gameRooms.get(roomCode)!;
      const player = room.players.find((p) => p.id === socket.id);
      if (player && !player.requestedSkip) {
        player.requestedSkip = true;
        room.skipRequests++;

        const skipThreshold = Math.ceil(room.players.length * 0.9);
        if (room.skipRequests >= skipThreshold) {
          skipCurrentImage(roomCode);
        } else {
          // Notify all players about the new skip request count
          io.to(roomCode).emit("skipRequestUpdate", {
            skipRequests: room.skipRequests,
            skipThreshold: skipThreshold,
          });
        }
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");

    // Handle player disconnection (remove from room, etc.)
    for (const [roomCode, room] of gameRooms.entries()) {
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);
      if (playerIndex !== -1) {
        io.to(roomCode).emit("removePlayer", socket.id);

        room.players.splice(playerIndex, 1);
        if (room.hostId === socket.id && room.players.length > 0) {
          // If the host disconnects, assign a new host
          room.hostId = room.players[0].id;
          room.players[0].isHost = true;
          io.to(room.players[0].id).emit("becameHost");
        }
        if (room.players.length === 0) {
          // If no players left, delete the room
          gameRooms.delete(roomCode);
        }
        break;
      }
    }
  });
});

async function startRound(roomCode: string) {
  const room = gameRooms.get(roomCode);
  if (!room) return;

  room.currentRound++;
  room.isLoading = true;
  io.to(roomCode).emit("loadingState", true);

  if (room.currentRound <= room.settings.rounds) {
    try {
      const roundData = await getRandomImageAndText();
      room.roundData = roundData;
      room.roundEndTime = Date.now() + room.settings.roundDuration * 1000;

      const hiddenText = hideText(roundData.text);
      room.players.forEach((player) => {
        player.hiddenText = hiddenText;
      });

      room.isLoading = false;
      io.to(roomCode).emit("loadingState", false);

      io.to(roomCode).emit("roundStart", {
        round: room.currentRound,
        imageUrl: roundData.url,
        hiddenText: hiddenText,
        duration: room.settings.roundDuration,
      });

      setTimeout(() => endRound(roomCode), room.settings.roundDuration * 1000);
    } catch (error) {
      console.error("Error starting round:", error);
      room.isLoading = false;
      io.to(roomCode).emit("loadingState", false);
      io.to(roomCode).emit("error", "Failed to start round");
    }
  } else {
    endGame(roomCode);
  }
}

async function setNewImage(room: GameRoom) {
  room.roundData = await getRandomImageAndText();
  room.roundEndTime = Date.now() + room.settings.roundDuration * 1000;
  room.skipRequests = 0;
  room.players.forEach((player) => (player.requestedSkip = false));
}

async function skipCurrentImage(roomCode: string) {
  const room = gameRooms.get(roomCode);
  if (!room) return;

  try {
    await setNewImage(room);

    io.to(roomCode).emit("imageSkipped", {
      newImageUrl: room.roundData!.url,
      newHiddenText: hideText(room.roundData!.text),
      remainingTime: Math.max(0, (room.roundEndTime! - Date.now()) / 1000),
    });
  } catch (error) {
    console.error("Error skipping image:", error);
    io.to(roomCode).emit("error", "Failed to skip image");
  }
}

function endRound(roomCode: string) {
  const room = gameRooms.get(roomCode);
  if (!room || !room.roundData) return;

  io.to(roomCode).emit("roundEnd", {
    round: room.currentRound,
    answer: room.roundData.text,
    scores: room.players.map((p) => ({ id: p.id, score: p.score })),
  });

  setTimeout(() => startRound(roomCode), 5000); // 5-second break between rounds
}

function endGame(roomCode: string) {
  const room = gameRooms.get(roomCode);
  if (!room) return;

  const winners = [...room.players].sort((a, b) => b.score - a.score);
  io.to(roomCode).emit("gameEnd", {
    winners: winners.map((p) => ({ id: p.id, score: p.score })),
  });
  gameRooms.delete(roomCode);
}

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
