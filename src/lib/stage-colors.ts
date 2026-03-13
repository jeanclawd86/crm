import { PipelineStage } from "./types";

export const stageColors: Record<PipelineStage, string> = {
  // Prospect stages — greens/oranges
  Lead: "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400",
  Intro: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Met: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Follow-up": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Demo Scheduled": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "Pilot Agreed": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  "Pilot Active": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  Customer: "bg-green-200 text-green-900 dark:bg-green-900/40 dark:text-green-300",
  Churned: "bg-orange-200 text-orange-900 dark:bg-orange-900/40 dark:text-orange-300",
  Pass: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  // Investor stages — blues/purples
  Researching: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  "Warm Intro": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  // "Met" is shared (uses emerald above)
  Pitched: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  "Due Diligence": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
  "Term Sheet": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Committed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Passed: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
};

export const stageDotColors: Record<PipelineStage, string> = {
  // Prospect stages
  Lead: "bg-lime-500",
  Intro: "bg-green-500",
  Met: "bg-emerald-500",
  "Follow-up": "bg-amber-500",
  "Demo Scheduled": "bg-orange-500",
  "Pilot Agreed": "bg-teal-500",
  "Pilot Active": "bg-cyan-500",
  Customer: "bg-green-600",
  Churned: "bg-orange-600",
  Pass: "bg-gray-400",
  // Investor stages
  Researching: "bg-sky-500",
  "Warm Intro": "bg-indigo-500",
  Pitched: "bg-violet-500",
  "Due Diligence": "bg-fuchsia-500",
  "Term Sheet": "bg-purple-500",
  Committed: "bg-blue-500",
  Passed: "bg-slate-400",
};
