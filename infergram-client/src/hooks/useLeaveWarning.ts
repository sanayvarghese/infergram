import React from "react";

export default function useLeavePageConfirm(active = true) {
  const beforeUnloadListener = (event: any) => {
    event.preventDefault();
    return (event.returnValue = "");
  };

  React.useEffect(() => {
    if (active) {
      addEventListener("beforeunload", beforeUnloadListener);
    } else {
      removeEventListener("beforeunload", beforeUnloadListener);
    }
  }, [active]);
}
