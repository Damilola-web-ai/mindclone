export type NavItem = {
  href: string;
  label: string;
  description: string;
};

export const dashboardNavItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    description: "Owner home and upcoming build progress.",
  },
  {
    href: "/dashboard/train",
    label: "Train",
    description: "Upload memories, transcripts, and writing.",
  },
  {
    href: "/dashboard/quiz",
    label: "Quiz",
    description: "Shape the personality core from onboarding prompts.",
  },
  {
    href: "/dashboard/private",
    label: "Private Mode",
    description: "Chat with the clone privately using notes, tasks, and reminders.",
  },
  {
    href: "/dashboard/corrections",
    label: "Corrections",
    description: "Reinforce how the clone should respond over time.",
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    description: "See visitors, topics, and memory usage at a glance.",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    description: "Profile, greeting, public visibility, and chat controls.",
  },
];
