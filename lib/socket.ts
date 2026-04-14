"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    // Use explicit env var if set, otherwise connect to same origin (works in any deployment)
    const url =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    socket = io(url, {
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}
