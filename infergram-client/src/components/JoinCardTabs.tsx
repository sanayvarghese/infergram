import { useState, useEffect, useMemo } from "react";
import { Socket } from "socket.io-client";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@nextui-org/react";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";
interface JoinCardProps {
  socket: Socket;
}

export default function JoinCardTabs({ socket }: JoinCardProps) {
  const [username, setUsername] = useState("");
  const [color, setColor] = useState("#ffffff");
  const [roomCode, setRoomCode] = useState("");
  const [roomCodeForInput, setRoomCodeForInput] = useState("");
  const colors = useMemo(
    () => [
      "#ffffff",
      "#929292",
      "#FF0000",
      "#84FF00",
      "#00ffd0",
      "#0080ff",
      "#8c00ff",
      "#ff0090",
    ],
    []
  );

  const searchParams = useSearchParams();

  useEffect(() => {
    const roomFromUrl = searchParams.get("room");
    if (roomFromUrl) setRoomCode(roomFromUrl);
  }, [searchParams]);

  useEffect(() => {
    setColor(colors[Math.floor(Math.random() * colors.length)]);
  }, [colors]);

  const handleCreateRoom = () => {
    if (socket) {
      socket.emit("createRoom", {
        username,
        color,
        settings: { numberOfRounds: 5, roundDuration: 60 },
      });
    }
  };

  const handleJoinRoom = () => {
    if (socket) {
      if (!(roomCode || roomCodeForInput)) {
        toast.error("Please enter a room code!");
        return;
      }
      socket.emit("joinRoom", {
        roomId: roomCode || roomCodeForInput,
        color,
        username,
      });
    }
  };
  return (
    <Tabs defaultValue="join" className="w-full md:w-[50%] ">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="join">Join</TabsTrigger>
        <TabsTrigger value="create">Create</TabsTrigger>
      </TabsList>
      <TabsContent value="join">
        <Card>
          <CardHeader>
            <CardTitle>Join Room</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                id="username"
                placeholder="Enter a username"
              />
            </div>
            <div className="w-full">
              <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(40px,1fr))] md:flex md:flex-wrap">
                {colors.map((colori, index) => (
                  <div
                    onClick={() => {
                      setColor(colori);
                    }}
                    key={`color-${index}`}
                    className={`rounded-full w-10 h-10 ${
                      colori === color ? "border-4 border-[#ffe600]" : ""
                    }`}
                    style={{ backgroundColor: colori }}
                  ></div>
                ))}
              </div>
            </div>
            {!roomCode && (
              <div className="space-y-1">
                <Label htmlFor="roomcode">Room Code</Label>
                <Input
                  value={roomCodeForInput}
                  onChange={(e) => setRoomCodeForInput(e.target.value)}
                  id="roomcode"
                  placeholder="Enter room's code"
                />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="bg-[#21e024] w-full  text-black font-bold"
              onClick={handleJoinRoom}
            >
              Join Room
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="create">
        <Card>
          <CardHeader>
            <CardTitle>Create Private Room</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                id="username"
                placeholder="Enter a username"
              />
            </div>
            <div className="w-full">
              <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(40px,1fr))] md:flex md:flex-wrap">
                {colors.map((colori, index) => (
                  <div
                    onClick={() => {
                      setColor(colori);
                    }}
                    key={`color-${index}`}
                    className={`rounded-full w-10 h-10 ${
                      colori === color ? "border-4 border-[#ffe600]" : ""
                    }`}
                    style={{ backgroundColor: colori }}
                  ></div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="bg-[#21e024] w-full text-black font-bold"
              onClick={handleCreateRoom}
            >
              Create Room
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
