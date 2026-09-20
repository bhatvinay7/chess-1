import { motion } from "framer-motion";
import styles from "./Analysis.module.css";

const WHITE_PIECES = [
  { key: "q" as const, sym: "♕" },
  { key: "r" as const, sym: "♖" },
  { key: "b" as const, sym: "♗" },
  { key: "n" as const, sym: "♘" },
];
const BLACK_PIECES = [
  { key: "q" as const, sym: "♛" },
  { key: "r" as const, sym: "♜" },
  { key: "b" as const, sym: "♝" },
  { key: "n" as const, sym: "♞" },
];

interface Props {
  promotingColor: "white" | "black";
  onSelect: (piece: "q" | "r" | "b" | "n") => void;
  onCancel: () => void;
}

export function PromotionDialog({ promotingColor, onSelect, onCancel }: Props) {
  const pieces = promotingColor === "white" ? WHITE_PIECES : BLACK_PIECES;

  return (
    <motion.div
      className={styles.promotionOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className={styles.promotionDialog}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.promotionTitle}>Promote to</span>
        <div className={styles.promotionPieces}>
          {pieces.map(({ key, sym }) => (
            <motion.button
              key={key}
              className={styles.promotionPieceBtn}
              onClick={() => onSelect(key)}
              whileHover={{ scale: 1.12, background: "rgba(129,182,76,0.2)" }}
              whileTap={{ scale: 0.95 }}
            >
              {sym}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
