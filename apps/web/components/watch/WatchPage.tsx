"use client";

import React from "react";
import { WatchList } from "@/components/chess/WatchList";
import styles from "./watch.module.css";

export default function WatchPage() {
  return (
    <div className={styles.page}>
      <WatchList enabled />
    </div>
  );
}
