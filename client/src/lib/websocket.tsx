import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { queryClient } from "./queryClient";
import { useAuth } from "./auth";

type WSContextType = {
  isConnected: boolean;
  unreadCount: number;
};

const WSContext = createContext<WSContextType>({ isConnected: false, unreadCount: 0 });

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const pollingRef = useRef<ReturnType<typeof setInterval>>();
  const wsFailedRef = useRef(false);

  const pollUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications/unread-count", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch {}
  }, [user]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollUnreadCount();
    pollingRef.current = setInterval(pollUnreadCount, 15000);
  }, [pollUnreadCount]);

  const connect = useCallback(() => {
    if (!user) return;
    if (wsFailedRef.current) {
      startPolling();
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => {
        setIsConnected(false);
        wsFailedRef.current = true;
        startPolling();
      };
      ws.onerror = () => {
        wsFailedRef.current = true;
        startPolling();
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "notification") {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            setUnreadCount(prev => prev + 1);
          } else if (data.type === "unread_count") {
            setUnreadCount(data.count);
          }
        } catch {}
      };
    } catch {
      wsFailedRef.current = true;
      startPolling();
    }
  }, [user, startPolling]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return (
    <WSContext.Provider value={{ isConnected, unreadCount }}>
      {children}
    </WSContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WSContext);
}
