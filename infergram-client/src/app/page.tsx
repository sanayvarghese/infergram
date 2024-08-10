"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSocket from "@/hooks/useSocket";
import GameArea from "@/components/GameArea";
import toast from "react-hot-toast";
import useLeaveWarning from "../hooks/useLeaveWarning";
import NavBar from "@/components/NavBar";
import JoinCardTabs from "@/components/JoinCardTabs";
import { Radio } from "react-loader-spinner";
import { Player } from "@/types";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [isInGame, setIsInGame] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const router = useRouter();
  const socket = useSocket(
    `${process.env["NEXT_PUBLIC_SOCKETSERVER"] || "https://api.infergram.live"}`
  );
  const [players, setPlayers] = useState<Player[]>([]);
  useLeaveWarning(isInGame);
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    if (socket) {
      socket.on("connect_error", () => {
        setConnected(false);
        toast.dismiss("connectfailed");
        toast.error("Failed to connect to server!", {
          id: "connectfailed",
        });
      });

      socket.on("connect", () => {
        setConnected(true);
        toast.success("Connected to server.");
      });

      socket.on("roundStart", ({ round }) => {
        if (round === 1) {
          setPlayers((prev) => {
            var newList = prev.map((player) => {
              player.score = 0;
              return player;
            });
            return newList;
          });
        }
      });
      socket.on("roomCreated", ({ roomId, isHost: hostStatus }) => {
        setRoomCode(roomId);
        setIsInGame(true);
        router.push(`/?room=${roomId}`);
        setIsHost(hostStatus);
      });

      socket.on("joinedRoom", ({ roomId, isHost: hostStatus }) => {
        setRoomCode(roomId);
        router.push(`/?room=${roomId}`);

        setIsInGame(true);
        setIsHost(hostStatus);
      });
      socket.on("error", (message: string) => {
        toast.error(message);
      });
      socket.on("disconnect", () => {
        toast.error("Disconnected from server! Try refreshing");
        setConnected(false);
      });
      if (isInGame) {
        socket.on("playerList", (playerList: Player[]) => {
          setPlayers(playerList);
        });
        socket.on("gameEnd", (playerList: Player[]) => {
          setPlayers((prev) => {
            var newList = prev.map((player) => {
              player.score = 0;
              return player;
            });
            return newList;
          });
        });

        socket.on("newHost", ({ hostId }) => {
          if (hostId === socket.id) {
            setIsHost(true);
          }
          setPlayers((prevPlayers) =>
            prevPlayers.map((player) =>
              player.id === hostId ? { ...player, isHost: true } : player
            )
          );
        });
      }

      return () => {
        socket.off("newHost");
        socket.off("roomCreated");
        socket.off("joinedRoom");
        socket.off("error");
        socket.off("disconnect");

        if (isInGame) {
          socket.off("gameEnd");
          socket.off("roundStart");
          socket.off("playerList");
          socket.off("newHost");
        }
      };
    }
  }, [socket, isInGame, connected, router]);

  if (!socket || !connected) {
    return (
      <div className="flex gap-2 font-bold text-medium justify-center items-center w-full h-[100vh]">
        <Radio
          visible={true}
          height="80"
          width="80"
          colors={["#8387F4", "#7671D4", "#4D43BF"]}
          ariaLabel="radio-loading"
          wrapperStyle={{}}
          wrapperClass=""
        />
        Connecting to server...
      </div>
    );
  }

  if (isInGame) {
    return (
      <main className="mx-auto p-5 w-full lg:w-[90%]">
        {/* <h1 className="text-2xl font-bold mb-4">Room Code: {roomCode}</h1>
        <FaRegCopy onClick={() => {}} /> */}
        <div className="flex">
          <div className="w-full">
            <GameArea
              isInGame={isInGame}
              socket={socket}
              isHost={isHost}
              roomCode={roomCode}
              players={players}
            />
          </div>
        </div>
      </main>
    );
  }
  return (
    <div className="p-5 w-full ">
      <NavBar isInGame={isInGame} roomCode={roomCode} socket={socket}></NavBar>
      <div className="w-full h-full flex flex-col justify-center items-center space-y-10">
        <p className="text-gray-600 text-sm w-full md:w-[45%] text-center">
          Welcome to Infergram: Where images spark words and friends compete!
          Guess hidden phrases, race the clock, and challenge your crew in this
          multiplayer game. Join now and see who can infer the most!
        </p>
        <JoinCardTabs socket={socket} />
      </div>
    </div>
  );
}
