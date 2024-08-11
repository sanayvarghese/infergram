import { Socket } from "socket.io-client";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import toast from "react-hot-toast";
import { FaCopy } from "react-icons/fa";
import { Player } from "@/types";

interface PlayerListProps {
  socket: Socket;
  players: Player[];
  roomCode: string;
}

export default function PlayerList({
  socket,
  players,
  roomCode,
}: PlayerListProps) {
  return (
    <div className="flex h-full flex-col justify-between gap-5">
      <div className="space-y-2">
        <h2 className="text-xl font-bold mb-2">Players</h2>
        <ul className="space-y-2">
          {players
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <li
                key={player.id}
                className={` ${player.id == socket.id ? "font-bold" : ""}`}
                style={{
                  color: player.color,
                }}
              >
                #{index + 1} - {player.name} {player.isHost && "⚙️"} -{" "}
                {player.score}💎 {player.id == socket.id ? "(You)" : ""}
              </li>
            ))}
        </ul>
      </div>
      <div className="flex flex-col w-full items-center gap-3 justify-center">
        <Separator />

        <p className="text-slate-100 flex  gap-3 font-mono font-bold cursor-pointer">
          Room Code: {roomCode}{" "}
          <FaCopy
            onClick={() => {
              const textToCopy = roomCode;

              if (navigator.clipboard && window.isSecureContext) {
                // Navigator clipboard API method
                navigator.clipboard.writeText(textToCopy).then(() => {
                  toast.success("Room Link Copied");
                });
              } else {
                // Fallback method
                const textArea = document.createElement("textarea");
                textArea.value = textToCopy;
                // Ensure the text area is not visible
                textArea.style.position = "fixed";
                textArea.style.top = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                  document.execCommand("copy");
                  toast.success("Room Code Copied");
                } catch (err) {
                  toast.error("Cannot copy the code!");
                }

                document.body.removeChild(textArea);
              }
            }}
          />
        </p>
        <div className="flex w-full gap-3  sm:flex-col xl:flex-row ">
          <Button
            className="w-full"
            onClick={() => {
              const textToCopy = `${window.location.origin}/?room=${roomCode}`;

              if (navigator.clipboard && window.isSecureContext) {
                // Navigator clipboard API method
                navigator.clipboard.writeText(textToCopy).then(() => {
                  toast.success("Room Link Copied");
                });
              } else {
                // Fallback method
                const textArea = document.createElement("textarea");
                textArea.value = textToCopy;
                // Ensure the text area is not visible
                textArea.style.position = "fixed";
                textArea.style.top = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                  document.execCommand("copy");
                  toast.success("Room Link Copied");
                } catch (err) {
                  toast.error("Cannot copy the link!");
                }

                document.body.removeChild(textArea);
              }
            }}
          >
            Copy Link
          </Button>
          <Button
            className="w-full"
            onClick={async () => {
              const shareData = {
                title: "Join InferGram Room",
                text: `Hey, Join InferGram room using the link or using code - ${roomCode} `,
                url: `${window.location.origin}/?room=${roomCode}`,
              };

              if (navigator?.share) {
                await navigator.share(shareData);
              } else {
                toast.error("Share functionality is not available.");
              }
            }}
          >
            Share Link
          </Button>
        </div>
      </div>
    </div>
  );
}
