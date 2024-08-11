import React from "react";
interface LeaderBoardStand {
  position: number;
  name: string;
  score: string;
}
function LeaderBoardStand({ position, name, score }: LeaderBoardStand) {
  return (
    <div className="flex flex-col text-center h-full w-full justify-end">
      <div className="text-center">
        {position == 1 ? "👑" : ""} {name} - {score}
      </div>
      <div
        className={`border-t-2 border-x-2 rounded border-slate-300 w-full ${
          position == 1
            ? "h-[45%] min-w-[20px] "
            : position == 2
            ? "h-[35%]  min-w-[20px]"
            : position == 3
            ? "h-[25%]  min-w-[20px]"
            : "h-0 w-0"
        }flex items-center justify-center`}
      >
        <p>Top {position.toString()}</p>
      </div>
    </div>
  );
}

export default LeaderBoardStand;
