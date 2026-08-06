"use client";

import { useState } from "react";
import { CoachSetup } from "./CoachSetup";
import { CoachBoard } from "./CoachBoard";
import type { CoachGameConfig } from "@/hooks/useCoachGame";

export function CoachPage() {
  const [config, setConfig] = useState<CoachGameConfig | null>(null);

  if (!config) {
    return <CoachSetup onStart={setConfig} />;
  }

  return <CoachBoard config={config} onQuit={() => setConfig(null)} />;
}
