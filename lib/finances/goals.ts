import type { SavingsGoal } from "@/types/database";

export interface GoalProjection {
  progressPercentage: number;
  remainingAmount: number;
  estimatedMonthsToReach: number | null;
  estimatedCompletionDate: string | null;
  isOnTrack: boolean | null;
}

export function calculateGoalProjection(goal: SavingsGoal): GoalProjection {
  const current = Number(goal.current_amount) || 0;
  const target = Number(goal.target_amount) || 1;
  const remaining = Math.max(0, target - current);
  const percentage = Math.min(100, Math.round((current / target) * 100));

  const monthly = Number(goal.monthly_contribution) || 0;
  let monthsToReach: number | null = null;
  let completionDate: string | null = null;
  let onTrack: boolean | null = null;

  if (remaining === 0) {
    monthsToReach = 0;
    onTrack = true;
  } else if (monthly > 0) {
    monthsToReach = Math.ceil(remaining / monthly);
    const date = new Date();
    date.setMonth(date.getMonth() + monthsToReach);
    completionDate = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    if (goal.deadline) {
      const deadlineDate = new Date(goal.deadline);
      onTrack = date <= deadlineDate;
    }
  }

  return {
    progressPercentage: percentage,
    remainingAmount: remaining,
    estimatedMonthsToReach: monthsToReach,
    estimatedCompletionDate: completionDate,
    isOnTrack: onTrack,
  };
}
