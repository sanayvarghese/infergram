import { Socket } from "socket.io-client";
import Image from "next/image";
import { LuAlarmClock } from "react-icons/lu";
interface NavBarProps {
  socket: Socket;
  roomCode: string;
  isInGame: boolean;
  timeRemaining?: number;
  totalRounds?: number;
  currentRound?: number;
}

export default function NavBar({
  isInGame,
  currentRound,
  totalRounds,
  timeRemaining,
}: NavBarProps) {
  // const [players, setPlayers] = useState<Player[]>([]);

  // useEffect(() => {
  //   socket.on("playerList", (playerList: Player[]) => {
  //     setPlayers(playerList);
  //   });

  //   socket.on("newHost", ({ hostId }) => {
  //     setPlayers((prevPlayers) =>
  //       prevPlayers.map((player) =>
  //         player.id === hostId ? { ...player, isHost: true } : player
  //       )
  //     );
  //   });

  //   return () => {
  //     socket.off("playerList");
  //     socket.off("newHost");
  //   };
  // }, [socket]);

  return (
    <nav
      className={`mb-5 flex ${isInGame ? "justify-between" : "justify-center"}`}
    >
      <a href={"/"}>
        <div className="flex items-center">
          <Image src="/logo.png" width={80} height={80} alt="InferGram Logo" />
          <h1 className="font-bold text-2xl "> InferGram</h1>
        </div>
      </a>

      {isInGame ? (
        <>
          <div className="flex flex-col sm:flex-row justify-center  items-center font-bold text-lg gap-2">
            <p>
              Round {currentRound}/{totalRounds}
            </p>
            <div className="sm:w-[1px] sm:h-8 w-8 h-[1px] bg-slate-400"></div>
            <div className="flex items-center gap-2">
              <LuAlarmClock size={30} />
              {timeRemaining}s
            </div>
          </div>
        </>
      ) : (
        <>
          <div></div>
        </>
      )}
    </nav>
  );
}
