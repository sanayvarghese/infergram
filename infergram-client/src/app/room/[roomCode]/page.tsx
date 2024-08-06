"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "../../contexts/SocketContext";

export default function Room() {
  const { roomCode } = useParams();
  const socket = useSocket();
  const router = useRouter();
  const [gameState, setGameState] = useState({
    isHost: false,
    players: [] as string[],
    currentRound: 0,
    totalRounds: 0,
    imageUrl: "",
    hiddenText: "",
    timeRemaining: 0,
    scores: {} as Record<string, number>,
    skipRequests: 0,
    skipThreshold: 0,
    isLoading: false,
  });
  const [guess, setGuess] = useState("");

  useEffect(() => {
    if (roomCode && socket) {
      socket.emit("joinRoom", roomCode);

      socket.on("joinedRoom", (data: { roomCode: string; isHost: boolean }) => {
        setGameState((prev) => ({ ...prev, isHost: data.isHost }));
      });

      socket.on("playerJoined", (player: any) => {
        setGameState((prev) => ({
          ...prev,
          players: [...prev.players, player],
        }));
      });

      socket.on("roundStart", (data: any) => {
        setGameState((prev) => ({
          ...prev,
          currentRound: data.round,
          imageUrl: data.imageUrl,
          hiddenText: data.hiddenText,
          timeRemaining: data.duration,
        }));
      });

      socket.on("guessResult", (result: any) => {
        if (result.correctWords) {
          setGameState((prev) => ({
            ...prev,
            hiddenText: result.updatedHiddenText,
            scores: {
              ...prev.scores,
              [socket.id as string]:
                (prev.scores[socket.id as string] || 0) + result.scoreGained,
            },
          }));
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

      return () => {
        socket.off("joinedRoom");
        socket.off("playerJoined");
        socket.off("roundStart");
        socket.off("guessResult");
        socket.off("skipRequestUpdate");
        socket.off("imageSkipped");
        socket.off("roundEnd");
        socket.off("gameEnd");
        socket.off("loadingState");
      };
    }
  }, [roomCode, socket]);

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
              className="border p-2 rounded mr-2"
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
        <h2 className="text-2xl font-bold mt-4">Scores:</h2>
        {Object.entries(gameState.scores).map(([playerId, score]) => (
          <p
            key={playerId}
            className={gameState.hiddenText === "" ? "text-green-500" : ""}
          >
            {playerId}: {score}
          </p>
        ))}
      </div>
    </div>
  );
}
