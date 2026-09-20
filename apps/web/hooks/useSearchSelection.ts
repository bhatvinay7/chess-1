import { useState, useCallback } from "react";
import { TIME_CONTROLS, TimeGroup } from "@/lib/timeControls";

export function useSearchSselection() {
  const [time_slot, setSelectTimeSlot] = useState<{
    label: string;
    value: string;
  }>({ label: "1 min", value: "1+0" });
  const [group, setSelectedGroup] = useState<TimeGroup>({
    category: "Bullet",
    icon: "⚡",
    options: [
      { label: "1 min", value: "1+0" },
      { label: "1 | 1", value: "1+1" },
      { label: "2 | 1", value: "2+1" },
    ],
  });
  const [isRated, setIsRated] = useState(true);
  const [gameVariant, setGameVariant] = useState<"standard" | "chess960">(
    "standard",
  );

  const setTimeControl = useCallback((selected: string) => {
    const selectedOption = TIME_CONTROLS.flatMap((g) => g.options).find(
      (o) => o.value === selected,
    );
    const selectedGroup = TIME_CONTROLS.find((g) =>
      g.options.some((o) => o.value === selected),
    );
    setSelectedGroup(selectedGroup!);
    setSelectTimeSlot(selectedOption!);
  }, []);

  const setIsRatedGame = useCallback((rated: boolean) => {
    setIsRated((rated) => !rated);
  }, []);
  return {
    isRated,
    time_slot,
    group,
    setTimeControl,
    setIsRatedGame,
    gameVariant,
    setGameVariant,
  };
}
