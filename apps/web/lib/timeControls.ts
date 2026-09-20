export interface TimeGroup {
  category: string;
  icon: string;
  options: { label: string; value: string }[];
}

export const TIME_CONTROLS: TimeGroup[] = [
  {
    category: "Bullet",
    icon: "⚡",
    options: [
      { label: "1 min", value: "1+0" },
      { label: "1 | 1", value: "1+1" },
      { label: "2 | 1", value: "2+1" },
    ],
  },
  {
    category: "Blitz",
    icon: "🔥",
    options: [
      { label: "3 min", value: "3+0" },
      { label: "3 | 2", value: "3+2" },
      { label: "5 min", value: "5+0" },
    ],
  },
  {
    category: "Rapid",
    icon: "⏱",
    options: [
      { label: "10 min", value: "10+0" },
      { label: "15 | 10", value: "15+10" },
      { label: "30 min", value: "30+0" },
    ],
  },
  // {
  //   category: "Daily",
  //   icon: "📅",
  //   options: [
  //     { label: "1 day", value: "1d" },
  //     { label: "3 days", value: "3d" },
  //     { label: "7 days", value: "7d" },
  //   ],
  // },
];
