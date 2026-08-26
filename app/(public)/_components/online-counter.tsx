"use client";

import { useEffect, useRef, useState } from "react";

const PING_INTERVAL_MS = 15_000;

export function OnlineCounter() {
  const [count, setCount] = useState<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionIdRef.current) sessionIdRef.current = crypto.randomUUID();
    const sessionId = sessionIdRef.current;

    function ping() {
      fetch("/api/presence/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((data) => setCount(data.count))
        .catch(() => {});
    }

    ping();
    const interval = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (count === null) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-1.5 rounded-full bg-live" />
      <span className="text-live">{count} đang online</span>
    </span>
  );
}
