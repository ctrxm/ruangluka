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

  const connect = useCallback(() => {
    if (!user) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => {
      setIsConnected(false);
      reconnectRef.current = setTimeout(connect, 3000);
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
  }, [user]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
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
