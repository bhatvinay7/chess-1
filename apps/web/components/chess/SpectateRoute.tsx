"use client";

import React from "react";
import { useParams } from "next/navigation";
import { SpectatorBoard } from "./SpectatorBoard";
import styles from "./SpectateRoute.module.css";

export default function SpectateRoute() {
  const params = useParams();
  const gameId = params?.gameId as string;

  if (!gameId) return null;

  return (
    <div className={styles.container}>
      <SpectatorBoard gameId={gameId} />
    </div>
  );
}
