import { Request, Response } from "express";
import { Chess } from "chess.js";
import { prisma } from "@repo/postgres-db";

export async function uploadPuzzle(req: Request, res: Response): Promise<void> {
  const { initialFen, solution, movesToMate, rating } = req.body as {
    initialFen?: string;
    solution?: string[];
    movesToMate?: number;
    rating?: number;
  };

  if (!initialFen) {
    res.status(400).json({ error: "initialFen is required" });
    return;
  }
  if (!solution || !Array.isArray(solution) || solution.length === 0) {
    res.status(400).json({ error: "solution must be a non-empty array of moves" });
    return;
  }
  if (!movesToMate || movesToMate < 1) {
    res.status(400).json({ error: "movesToMate must be a positive integer" });
    return;
  }

  let chess: Chess;
  try {
    chess = new Chess(initialFen);
  } catch {
    res.status(400).json({ error: "Invalid FEN" });
    return;
  }

  for (const move of solution) {
    try {
      chess.move(move);
    } catch {
      res.status(400).json({ error: `Invalid move in solution: ${move}` });
      return;
    }
  }

  try {
    const puzzle = await prisma.puzzle.create({
      data: {
        initialFen,
        solution,
        movesToMate,
        rating: rating ?? 1200,
      },
    });

    res.status(201).json({ message: "Puzzle uploaded successfully", puzzleId: puzzle.id, rating: puzzle.rating });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}
