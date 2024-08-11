import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import LeaderBoardStand from "./LeaderBoardStand";
import { Player } from "@/types";

interface ImageDisplayProps {
  imageUrl: string;
  socket: Socket;
  roundFinish: boolean;
}

export default function ImageDisplay({
  imageUrl,
  socket,
  roundFinish,
}: ImageDisplayProps) {
  const [showScoreCard, setShowScoreCard] = useState<boolean>(false);
  const [playersScores, setPlayersScores] = useState<Player[]>([]);

  useEffect(() => {
    socket.on("roundStart", ({ round }) => {
      if (round === 1) {
        setShowScoreCard(false);
      }
      // setIsLoading(true);
    });
    socket.on("gameEnd", ({ finalScores }) => {
      setShowScoreCard(true);
      setPlayersScores(finalScores);
    });

    return () => {
      // socket.off("gameEnd");
      // socket.off("roundStart");
    };
  }, [socket]);
  return (
    <div className="w-full h-64 bg-[#0a031c] rounded-xl flex items-center justify-center overflow-hidden">
      {showScoreCard ? (
        <div className="flex flex-col w-full h-full text-center p-5">
          <p className="font-bold text-lg mt-2">Scoreboard</p>
          <div className="flex w-full h-full justify-center items-end gap-10 text-center">
            {playersScores.slice(0, 3).map((player, index) => {
              return (
                <LeaderBoardStand
                  key={`leaderboard${index}`}
                  position={index + 1}
                  name={player.name}
                  score={player.score.toString()}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className=" w-full h-full relative flex items-center justify-center">
          {roundFinish ? (
            <div className="absolute inset-0 bg-[#11111195] text-3xl font-bold flex items-center justify-center z-10">
              Round Ends
            </div>
          ) : (
            <></>
          )}

          <>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Guess this"
                className="object-contain w-full h-full"
              />
            ) : (
              <p>Waiting for host to start...</p>
            )}
          </>
        </div>
      )}
    </div>
  );
}
