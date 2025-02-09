import { useEffect, useRef, useCallback } from 'react';

interface WebSocketHook {
  sendMessage: (message: any) => void;
  isConnected: boolean;
}

export function useWebSocket(url: string, onMessage: (data: any) => void): WebSocketHook {
  const ws = useRef<WebSocket | null>(null);
  const isConnected = useRef(false);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      isConnected.current = true;
    };

    ws.current.onclose = () => {
      isConnected.current = false;
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url, onMessage]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current && isConnected.current) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    sendMessage,
    isConnected: isConnected.current
  };
}