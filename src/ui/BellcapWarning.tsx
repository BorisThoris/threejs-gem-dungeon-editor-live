import { useEffect, useState } from "react";
import { useRun } from "../game/state/run";
import { bellcapWarnings } from "../game/worldbuilding/bellcapState";

export function BellcapWarning() {
  const roomId = useRun(s => s.currentRoomId);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const read = () => setActive([...bellcapWarnings.values()].includes(roomId ?? ""));
    read();
    const timer = window.setInterval(read, 100);
    return () => window.clearInterval(timer);
  }, [roomId]);
  return active ? <div data-testid="bellcap-warning" style={{ color: "#e0c67d", marginBottom: 8 }}>
    Bellcaps swelling · lower the lantern one band or step away
  </div> : null;
}
