"use client";

import React from "react";
import { useParams } from "next/navigation";
import TournamentDetail from "./TournamentDetail";

export default function TournamentDetailRoute() {
  const params = useParams();
  const id = params?.id as string;
  if (!id) return null;
  return <TournamentDetail id={id} />;
}
