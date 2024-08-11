import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface GuessInputProps {
  socket: Socket;
  roomId: string;
  isGameStarted: boolean;
}
interface MessageType {
  message: string;
  type: "success" | "error" | "warning" | null;
}
export default function GameChat({
  socket,
  roomId,
  isGameStarted,
}: GuessInputProps) {
  const [guess, setGuess] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const [messages, setMessages] = useState<MessageType[]>([]);

  useEffect(() => {
    socket.on("message", (m: MessageType) => {
      setMessages((prev) => {
        return [...prev, m];
      });
    });

    return () => {
      socket.off("message");
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim() && isGameStarted) {
      socket.emit("guess", { guess: guess.trim(), roomId });
      setGuess("");
    }
  };

  return (
    <div className="w-full text-white h-[30vh] sm:h-[45vh] bg-[#0a031c] rounded-xl   flex flex-col items-center justify-center">
      <div className="w-full h-full flex flex-col overflow-y-scroll">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`my-1 p-[8px]
            rounded-md
            ${
              message.type == "error"
                ? "bg-[#fb1616d1]"
                : message.type == "success"
                ? "bg-[#9cfb16d1]"
                : message.type == "warning"
                ? "bg-[#fbd516d1]"
                : "bg-[#aeaeae]"
            }
           `}
          >
            {message.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex justify-between w-full p-2 space-x-2"
      >
        <Input
          title={
            !isGameStarted ? "Send guesses when game starts" : "Enter guess"
          }
          disabled={!isGameStarted}
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          className="flex-grow rounded-xl w-full p-2 border"
          placeholder="Enter your guess"
        />

        <Button
          title={
            !isGameStarted ? "Send guesses when game starts" : "Send guess"
          }
          disabled={!isGameStarted}
          type="submit"
          // className={`${
          //   !isGameStarted ? "bg-[#ffffff]" : "bg-[#ffffff]"
          // } px-4 py-2 rounded`}
        >
          Guess
        </Button>
      </form>
    </div>
  );
}
