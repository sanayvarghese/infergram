import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import GameChat from "./GameChat";
import ImageDisplay from "./ImageDisplay";
import { IoMdInformationCircleOutline } from "react-icons/io";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PlayerList from "./PlayerList";
import NavBar from "./NavBar";
import { Button } from "./ui/button";
import { Player } from "@/types";

interface GameAreaProps {
  socket: Socket;
  isHost: boolean;
  isInGame: boolean;
  roomCode: string;
  players: Player[];
}

export default function GameArea({
  socket,
  isHost,
  roomCode,
  players,
  isInGame,
}: GameAreaProps) {
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [hiddenText, setHiddenText] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);

  const roundEndTimeRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRoundFinish, setShowRoundFinish] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const [skipVotes, setSkipVotes] = useState(0);

  const [totalPlayers, setTotalPlayers] = useState(0);
  // Settings
  const [rounds, setRounds] = useState(5);
  const [roundDuration, setRoundDuration] = useState(60);

  useEffect(() => {
    socket.on(
      "roundStart",
      ({
        round,
        totalRounds,
        imageUrl,
        hiddenText,
        roundDuration,
        serverTime,
      }) => {
        setShowRoundFinish(false);

        setCurrentRound(round);
        setTotalRounds(totalRounds);
        setImageUrl(imageUrl);
        setHiddenText(hiddenText);
        setIsLoading(false);
        setIsGameStarted(true);
        // Calculate the round end time based on server time
        const roundEndTime = serverTime + roundDuration * 1000;
        roundEndTimeRef.current = roundEndTime;

        // Set initial time remaining
        const initialTimeRemaining = Math.max(
          0,
          Math.ceil((roundEndTime - Date.now()) / 1000)
        );
        setTimeRemaining(initialTimeRemaining);
      }
    );

    socket.on("guessResult", ({ updatedHiddenText }) => {
      if (updatedHiddenText) {
        setHiddenText(updatedHiddenText);
      }
    });
    socket.on("roundEnd", ({ word }) => {
      setShowRoundFinish(true);
      setHiddenText(word);
      setTimeRemaining(0);
      roundEndTimeRef.current = null;
    });
    socket.on("loading", () => {
      setIsLoading(true);
    });

    socket.on("skipVoteUpdate", ({ skipVotes, totalPlayers }) => {
      setSkipVotes(skipVotes);
      setTotalPlayers(totalPlayers);
    });

    if (!isHost) {
      socket.on("settingUpdated", ({ rounds, roundDuration }) => {
        setRoundDuration(roundDuration);
        setRounds(rounds);
      });
    }

    socket.on("gameEnd", ({ finalScores }) => {
      setCurrentRound(0);
      setTotalRounds(0);
      setImageUrl("");
      setHiddenText("");
      setIsLoading(false);
      setIsGameStarted(false);
      setTimeRemaining(0);
    });

    return () => {
      // socket.off("roundStart");
      socket.off("guessResult");
      socket.off("roundEnd");
      socket.off("gameEnd");
      socket.off("loading");

      socket.off("skipVoteUpdate");
      if (!isHost) socket.off("changeSettings");
    };
  }, [socket, isHost]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const updateTimer = () => {
      if (roundEndTimeRef.current) {
        const newTimeRemaining = Math.max(
          0,
          Math.ceil((roundEndTimeRef.current - Date.now()) / 1000)
        );
        setTimeRemaining(newTimeRemaining);

        if (newTimeRemaining > 0) {
          timer = setTimeout(updateTimer, 100); // Update more frequently for smoother countdown
        } else {
          roundEndTimeRef.current = null;
        }
      }
    };

    if (roundEndTimeRef.current && !isLoading) {
      updateTimer();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);

  useEffect(() => {
    if (isHost) {
      socket.emit("changeSettings", { rounds, roundDuration, roomCode });
    }
  }, [roundDuration, rounds, isHost, socket, roomCode]);

  const handleStartGame = () => {
    socket.emit("startGame", roomCode);
    // setCurrentRound(1);
  };
  const handleSkipVote = () => {
    socket.emit("skipVote", roomCode);
  };
  return (
    <div className="space-y-10 ">
      <NavBar
        isInGame={isInGame}
        currentRound={currentRound}
        totalRounds={totalRounds}
        timeRemaining={timeRemaining}
        roomCode={roomCode}
        socket={socket}
      ></NavBar>

      <div className="w-full flex flex-col sm:flex-row gap-5 ">
        <div className="order-3 sm:order-1 w-full sm:w-[20%] bg-[#0a031c] rounded-xl p-4 mb-2 sm:mb-0">
          {/* box 1 */}

          <PlayerList socket={socket} players={players} roomCode={roomCode} />
        </div>
        <div className="order-2 sm:order-2 w-full sm:w-[50%]   p-4 mb-2 sm:mb-0">
          {/* box 2 */}
          {isLoading ? (
            <div className="text-center w-full h-64 bg-[#0a031c] rounded-xl flex items-center justify-center overflow-hidden">
              Loading round...
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="flex flex-col md:flex-row justify-between gap-5 items-center w-full">
                {/* Settings and Start Button */}
                {currentRound === 0 && (
                  <div className="flex w-full flex-col sm:flex-row justify-between gap-5 items-start">
                    <div className="flex w-full items-center justify-center gap-5">
                      <label>Rounds:</label>
                      <Select
                        disabled={!isHost}
                        defaultValue="5"
                        required
                        value={rounds.toString()}
                        onValueChange={(val) => setRounds(parseInt(val))}
                      >
                        <SelectTrigger className="">
                          <SelectValue placeholder="Number of Rounds" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="6">6</SelectItem>
                            <SelectItem value="8">8</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex w-full items-center justify-center gap-5">
                      <label>Duration:</label>

                      <Select
                        disabled={!isHost}
                        defaultValue="60"
                        required
                        value={roundDuration.toString()}
                        onValueChange={(val) => {
                          setRoundDuration(parseInt(val));
                        }}
                      >
                        <SelectTrigger className="">
                          <SelectValue placeholder="Round Duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="20">20s</SelectItem>
                            <SelectItem value="40">40s</SelectItem>
                            <SelectItem value="60">60s</SelectItem>
                            <SelectItem value="80">80s</SelectItem>
                            <SelectItem value="90">90s</SelectItem>
                            <SelectItem value="120">120s</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {isHost && currentRound === 0 && (
                  <div className="flex flex-col gap-5 w-full ">
                    <Button
                      onClick={handleStartGame}
                      className="bg-[#11ab25] hover:bg-[#109621] text-white px-4 w-full py-2 rounded"
                    >
                      Start Game
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-2xl font-mono">{hiddenText}</p>
              <ImageDisplay
                socket={socket}
                imageUrl={imageUrl}
                roundFinish={showRoundFinish}
              />
              <div className="flex w-full gap-2 items-center">
                <IoMdInformationCircleOutline size={30} color="#4b5563" />
                <p className="text-gray-600 text-xs">
                  Note: The descriptive text is AI-generated and may not be
                  perfectly accurate. Trust your interpretation of the image.
                </p>
              </div>
              {isGameStarted ? (
                <>
                  <div className="w-full flex justify-between items-center">
                    <button
                      onClick={handleSkipVote}
                      className="bg-yellow-500 text-white px-4 py-2 rounded"
                    >
                      Skip Round ({skipVotes}/{Math.ceil(totalPlayers * 0.75)})
                    </button>
                  </div>
                </>
              ) : (
                <></>
              )}
            </div>
          )}
        </div>
        <div className="order-1 sm:order-3  w-full sm:w-[30%]  overflow-hidden rounded-xl  ">
          {/* box 3 */}

          <GameChat
            isGameStarted={isGameStarted}
            socket={socket}
            roomId={roomCode}
          />
        </div>
      </div>
    </div>
  );
}
