import { MobileArenaHeader } from "../../components/layout/MobileArenaHeader";
import styles from "../../components/arena/arena.module.css";

export default function ArenaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.arenaContent}>
      <MobileArenaHeader />
      <main className={styles.arenaMain}>{children}</main>
    </div>
  );
}
