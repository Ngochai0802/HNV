import { useEffect, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";

export default function useSignalR(conversationId, onReceiveMessage) {
  const connectionRef = useRef(null);

  const connect = useCallback(async () => {
    if (!conversationId) return;

    const token = localStorage.getItem("accessToken");
    const connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5255/hubs/chat", {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on("ReceiveMessage", (msg) => {
      if (onReceiveMessage) onReceiveMessage(msg);
    });

    try {
      await connection.start();
      await connection.invoke("JoinConversation", String(conversationId));
      connectionRef.current = connection;
    } catch (err) {
      console.error("SignalR error:", err);
    }
  }, [conversationId]);

  useEffect(() => {
    connect();
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [connect]);

  const sendSignalRMessage = useCallback(
    async (content, senderName, isAi = false) => {
      if (
        connectionRef.current?.state === signalR.HubConnectionState.Connected
      ) {
        await connectionRef.current.invoke(
          "SendMessage",
          String(conversationId),
          content,
          senderName,
          isAi,
        );
      }
    },
    [conversationId],
  );

  return { sendSignalRMessage };
}
