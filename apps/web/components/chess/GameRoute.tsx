"use client";

import React from "react";
import { useParams } from "next/navigation";
import ArenaChessBoard from "./ChessBoard";

export default function GameRoute() {
  const params = useParams();
  const gameId = params?.gameId as string;
  return <ArenaChessBoard urlGameId={gameId} />;
}
