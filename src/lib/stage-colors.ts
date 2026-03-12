import { PipelineStage } from "./types";

export const stageColors: Record<PipelineStage, string> = {
  Lead: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Met: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "Follow-up": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Pilot: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  Customer: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Pass: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export const stageDotColors: Record<PipelineStage, string> = {
  Lead: "bg-blue-500",
  Met: "bg-purple-500",
  "Follow-up": "bg-amber-500",
  Pilot: "bg-emerald-500",
  Customer: "bg-green-500",
  Pass: "bg-gray-400",
};
