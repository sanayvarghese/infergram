"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSocket } from "./contexts/SocketContext";
import toast from "react-hot-toast";
interface Player {
  username: string;
  id: string;
  score: number;
  host: boolean;
}
export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const socket = useSocket();

  const [roomJoined, setRoomJoined] = useState(false);

  const [gameState, setGameState] = useState<{
    state: "not-started" | "started" | "finished";
    players: Record<string, Player>[];
    currentRound: number;
    isHost: boolean;
    totalRounds: number;
    imageUrl: string;
    hiddenText: string;
    timeRemaining: number;
    roundDuration: number;
    scores: Record<string, [string, number]>;
    skipRequests: number;
    skipThreshold: number;
    isLoading: boolean;
  }>({
    state: "not-started",
    players: [],
    currentRound: 0,
    isHost: false,
    totalRounds: 0,
    imageUrl: "",
    hiddenText: "",
    timeRemaining: 0,
    roundDuration: 60,
    scores: {},
    skipRequests: 0,
    skipThreshold: 0,
    isLoading: false,
  });
  const [guess, setGuess] = useState("");

  useEffect(() => {
    setRoomCode(searchParams.get("room") ?? "");
    if (socket) {
      socket.on("error", (message: string) => {
        // Handle game end, show final scores, etc.
        toast.error(message);
      });
      return () => {
        socket.off("error");
      };
    }
  }, []);

  const createRoom = () => {
    if (!userName) {
      toast.error("Please provide a username!");
      return;
    }
    socket?.emit("createRoom", {
      username: userName,
      settings: { rounds: 5, roundDuration: 60 },
    });
    socket?.once("roomCreated", (data: { roomCode: string; id: string }) => {
      // router.push(`/room/${roomCode}`);
      setRoomCode(data.roomCode);
      setRoomJoined(true);
      console.log(data.id);

      var player: Player = {
        host: true,
        id: data.id,
        score: 0,
        username: userName,
      };
      var hostPlayer: Record<string, Player> = {
        [data.id]: player,
      };
      setGameState((prev) => ({
        ...prev,
        isHost: true,
        players: [hostPlayer],
      }));
    });
  };

  const joinRoom = () => {
    if (!userName) {
      toast.error("Please provide a username!");
      return;
    }
    if (!roomCode) {
      toast.error("Please enter a room id to join!");
      return;
    }
    socket?.emit("joinRoom", { username: userName, roomCode: roomCode });
    // socket?.once("joinedRoom", () => {
    //   router.push(`/room/${roomCode}`);
    // });
    setRoomJoined(true);
  };

  useEffect(() => {
    if (roomJoined && socket) {
      console.log(gameState.players);
      socket.on("playerJoined", (player: any) => {
        setGameState((prev) => ({
          ...prev,
          isHost: player.host,
          players: [...prev.players, player],
        }));
      });

      socket.on("roundStart", (data: any) => {
        setGameState((prev) => ({
          ...prev,
          state: "started",
          currentRound: data.round,
          imageUrl: data.imageUrl,
          hiddenText: data.hiddenText,
          timeRemaining: data.duration,
        }));
      });

      socket.on("guessResult", (result: any) => {
        if (result.correctWords) {
          setGameState((prev) => {
            const updatedPlayers = prev.players.map((playerRecord) => {
              if (playerRecord[socket.id as string]) {
                const currentScore =
                  playerRecord[socket.id as string].score || 0;
                return {
                  ...playerRecord,
                  [socket.id as string]: {
                    ...playerRecord[socket.id as string],
                    score: currentScore + result.scoreGained, // Update the score only
                  },
                };
              }
              return playerRecord;
            });

            return {
              ...prev,
              hiddenText: result.updatedHiddenText,
              players: updatedPlayers,
            };
          });
          // Show success message
        }
      });

      socket.on("skipRequestUpdate", (data: any) => {
        setGameState((prev) => ({
          ...prev,
          skipRequests: data.skipRequests,
          skipThreshold: data.skipThreshold,
        }));
      });

      socket.on("imageSkipped", (data: any) => {
        setGameState((prev) => ({
          ...prev,
          imageUrl: data.newImageUrl,
          hiddenText: data.newHiddenText,
          timeRemaining: data.remainingTime,
          skipRequests: 0,
        }));
      });

      socket.on("roundEnd", (data: any) => {
        setGameState((prev) => ({
          ...prev,
          scores: data.scores.reduce(
            (
              acc: Record<string, number>,
              { id, score }: { id: string; score: number }
            ) => ({ ...acc, [id]: score }),
            {}
          ),
        }));
      });

      socket.on("gameEnd", (data: any) => {
        // Handle game end, show final scores, etc.
      });

      socket.on("loadingState", (isLoading: boolean) => {
        setGameState((prev) => ({ ...prev, isLoading }));
      });

      socket.on("removePlayer", (id: string) => {
        setGameState((prev) => {
          // Filter out the player with the given id from each record in the players array
          const updatedPlayers = prev.players
            .map((playerRecord) => {
              const { [id]: removedPlayer, ...rest } = playerRecord;
              return rest;
            })
            .filter((playerRecord) => Object.keys(playerRecord).length > 0);

          return {
            ...prev,
            players: updatedPlayers,
          };
        });
      });

      return () => {
        socket.off("playerJoined");
        socket.off("roundStart");
        socket.off("guessResult");
        socket.off("skipRequestUpdate");
        socket.off("imageSkipped");
        socket.off("roundEnd");
        socket.off("gameEnd");
        socket.off("loadingState");
        socket.off("removePlayer");
      };
    }
  }, [socket, roomJoined]);

  const startGame = () => {
    socket?.emit("startGame", roomCode);
  };

  const submitGuess = () => {
    socket?.emit("guess", roomCode, guess);
    setGuess("");
  };

  const requestSkip = () => {
    socket?.emit("requestSkip", roomCode);
  };

  return (
    <main className="flex mx-auto p-4" style={{ height: "100%" }}>
      {roomJoined && roomCode != "" && userName != "" ? (
        <div className="container mx-auto p-4">
          <h1 className="text-3xl font-bold mb-4">Room: {roomCode}</h1>
          {gameState.isHost && !gameState.currentRound && (
            <button
              onClick={startGame}
              className="bg-green-500 text-white p-2 rounded mb-4"
            >
              Start Game
            </button>
          )}
          {gameState.isHost && (
            <p className="text-blue-500 font-bold">You are the host</p>
          )}
          {gameState.isLoading ? (
            <div className="text-center">
              <p className="text-xl">Loading...</p>
            </div>
          ) : (
            gameState.currentRound > 0 && (
              <div>
                <p>
                  Round: {gameState.currentRound} / {gameState.totalRounds}
                </p>
                <p>Time Remaining: {gameState.timeRemaining}</p>
                <img
                  src={gameState.imageUrl}
                  alt="Guess the image"
                  className="mb-4"
                />
                <p className="text-2xl mb-4">{gameState.hiddenText}</p>
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Enter your guess"
                  className="border text-black p-2 rounded mr-2"
                />
                <button
                  type="submit"
                  onClick={submitGuess}
                  className="bg-blue-500 text-white p-2 rounded"
                >
                  Submit Guess
                </button>
                <button
                  onClick={requestSkip}
                  className="bg-yellow-500 text-white p-2 rounded ml-2"
                >
                  Request Skip
                </button>
                <p>
                  Skip Requests: {gameState.skipRequests} /{" "}
                  {gameState.skipThreshold}
                </p>
              </div>
            )
          )}
          <div>
            <h2 className="text-2xl font-bold mt-4">Players:</h2>
            {gameState.players
              .flatMap((playerRecord) => Object.values(playerRecord))
              .map(({ username, score, id }) => (
                <p
                  key={id}
                  className={
                    !gameState.hiddenText.includes("_") &&
                    gameState.state === "started"
                      ? "text-green-500"
                      : ""
                  }
                >
                  {username}: {score}
                </p>
              ))}
          </div>
        </div>
      ) : (
        <div className="container flex flex-col items-center justify-center gap-2">
          <h1 className="text-3xl font-bold mb-4">Infergram</h1>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter Username"
            className="border text-black p-2 rounded mr-2"
          />
          {searchParams.get("room") != null ? (
            <></>
          ) : (
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Enter Room Code"
              className="border text-black p-2 rounded mr-2"
            />
          )}

          <button
            onClick={joinRoom}
            className="bg-green-500 text-white p-2 rounded"
          >
            Join Room
          </button>
          {searchParams.get("room") != null ? (
            <></>
          ) : (
            <button
              onClick={createRoom}
              className="bg-blue-500 text-white p-2 rounded mr-2"
            >
              Create a Private Room
            </button>
          )}
        </div>
      )}
    </main>
  );
}
