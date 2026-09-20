import { useCallback, useEffect, useState } from "react";
import { Chess, type Square } from "chess.js";
import { toSafeFen } from "@/lib/fen";
import type { SquareHandlerArgs } from "react-chessboard";
import type { PlayMode } from "../../hooks/useAnalysis";

export interface UseClickToMoveReturn {
  selectedSquare: string | null;
  validDests: Set<string>;
  captureDests: Set<string>;
  promotionPending: { from: string; to: string } | null;
  onSquareClick: (args: SquareHandlerArgs) => void;
  onPromotionSelect: (piece: "q" | "r" | "b" | "n") => void;
  cancelPromotion: () => void;
  clearSelection: () => void;
}

export function useClickToMove({
  activeFen,
  playMode,
  isEngineThinking,
  handlePlayMove,
}: {
  activeFen: string;
  playMode: PlayMode;
  isEngineThinking: boolean;
  handlePlayMove: (from: string, to: string, promotion?: string) => boolean;
}): UseClickToMoveReturn {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validDests, setValidDests] = useState<Set<string>>(new Set());
  const [captureDests, setCaptureDests] = useState<Set<string>>(new Set());
  const [promotionPending, setPromotionPending] = useState<{
    from: string;
    to: string;
  } | null>(null);

  // Clear selection when position changes (after any move)
  useEffect(() => {
    setSelectedSquare(null);
    setValidDests(new Set());
    setCaptureDests(new Set());
  }, [activeFen]);

  // Clear when switching play modes
  useEffect(() => {
    setSelectedSquare(null);
    setValidDests(new Set());
    setCaptureDests(new Set());
    setPromotionPending(null);
  }, [playMode]);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setValidDests(new Set());
    setCaptureDests(new Set());
  }, []);

  const selectSquare = useCallback((sq: string, fen: string) => {
    const chess = new Chess(toSafeFen(fen));
    const moves = chess.moves({ square: sq as Square, verbose: true });
    const valid = new Set<string>();
    const captures = new Set<string>();
    for (const m of moves) {
      valid.add(m.to);
      if (chess.get(m.to as Square)) captures.add(m.to);
    }
    setSelectedSquare(sq);
    setValidDests(valid);
    setCaptureDests(captures);
  }, []);

  const canMove = useCallback(
    (pieceColor: string, turn: "w" | "b"): boolean => {
      if (isEngineThinking) return false;
      if (playMode === "play-both") return pieceColor === turn;
      if (playMode === "play-white") return pieceColor === "w" && turn === "w";
      if (playMode === "play-black") return pieceColor === "b" && turn === "b";
      return false;
    },
    [playMode, isEngineThinking],
  );

  const onSquareClick = useCallback(
    (args: SquareHandlerArgs) => {
      const { piece, square } = args;
      if (playMode === "analysis" || isEngineThinking) return;

      const chess = new Chess(toSafeFen(activeFen));
      const turn = chess.turn() as "w" | "b";

      if (square === selectedSquare) {
        clearSelection();
        return;
      }

      if (selectedSquare && validDests.has(square)) {
        const moves = chess.moves({
          square: selectedSquare as Square,
          verbose: true,
        });
        const isPromotion = moves.some(
          (m) => m.to === square && m.promotion !== undefined,
        );

        if (isPromotion) {
          setPromotionPending({ from: selectedSquare, to: square });
          clearSelection();
        } else {
          handlePlayMove(selectedSquare, square);
        }
        return;
      }

      if (piece && canMove(piece.pieceType[0]!, turn)) {
        selectSquare(square, activeFen);
        return;
      }

      clearSelection();
    },
    [
      playMode,
      isEngineThinking,
      activeFen,
      selectedSquare,
      validDests,
      handlePlayMove,
      clearSelection,
      selectSquare,
      canMove,
    ],
  );

  const onPromotionSelect = useCallback(
    (promo: "q" | "r" | "b" | "n") => {
      if (!promotionPending) return;
      handlePlayMove(promotionPending.from, promotionPending.to, promo);
      setPromotionPending(null);
    },
    [promotionPending, handlePlayMove],
  );

  const cancelPromotion = useCallback(() => setPromotionPending(null), []);

  return {
    selectedSquare,
    validDests,
    captureDests,
    promotionPending,
    onSquareClick,
    onPromotionSelect,
    cancelPromotion,
    clearSelection,
  };
}
