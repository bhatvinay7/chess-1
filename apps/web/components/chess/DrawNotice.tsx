"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Handshake } from "lucide-react";

interface DrawNoticeProps {
  message: string;
  onDismiss: () => void;
  /** Auto-dismiss after this many ms. Defaults to 4000. */
  durationMs?: number;
}

/** Small auto-dismissing banner used to surface draw-flow messages
 *  (e.g. "Draw offer sent", "Your draw offer was declined"). */
export function DrawNotice({
  message,
  onDismiss,
  durationMs = 4000,
}: DrawNoticeProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  return (
    <AnimatePresence>
      <motion.div
        style={{
          position: "fixed",
          top: "max(12px, env(safe-area-inset-top))",
          left: "50%",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 18px",
          borderRadius: "8px",
          background: "#1a2a14",
          border: "1px solid rgba(93,171,58,0.3)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
          color: "#c8e6a8",
          fontSize: "0.85rem",
          fontWeight: 600,
          width: "max-content",
          maxWidth: "calc(100vw - 24px)",
          overflowWrap: "anywhere",
        }}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0, x: "-50%" }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.2 }}
      >
        <Handshake size={16} color="#84c441" />
        {message}
      </motion.div>
    </AnimatePresence>
  );
}

export default DrawNotice;
