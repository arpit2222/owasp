import {
  Project,
  RepositoryWithMeta,
} from "@/app/lib/types";

export interface HealthScore {
  score: number;
  status: "Healthy" | "Active" | "Needs Attention" | "Stale";
  metrics: {
    maturityScore: number;
    freshnessScore: number;
    issueScore: number;
    milestoneScore: number;
  };
}

const SCORING_WEIGHTS = {
  MATURITY: 20,
  FRESHNESS: 40,
  ISSUES: 25,
  MILESTONES: 15,
} as const;

function safeDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

export function calculateProjectHealth(
  project: Project,
  repositories: RepositoryWithMeta[]
): HealthScore {
  // --- 1. MATURITY SCORE (Max 20 pts) ---
  let maturityScore = 0;
  switch (project.level) {
    case "Flagship":
      maturityScore = SCORING_WEIGHTS.MATURITY;
      break;
    case "Production":
      maturityScore = 15;
      break;
    case "Lab":
      maturityScore = 10;
      break;
    case "Incubator":
      maturityScore = 5;
      break;
    default:
      maturityScore = 0;
  }

  // --- 2. FRESHNESS SCORE (Max 40 pts) ---
  const repoList = repositories ?? [];

  const releaseDates: Date[] = repoList
    .flatMap((repo) => repo.releases ?? [])
    .map((release) =>
      safeDate(release.publishedAt ?? release.createdAt ?? undefined)
    )
    .filter((d): d is Date => d !== null);

  const projectDates: Date[] = [
    safeDate(project.updatedAt),
    safeDate(project.createdAt),
  ].filter((d): d is Date => d !== null);

  const allDates: Date[] = [...releaseDates, ...projectDates];

  let freshnessScore = 0;
  if (allDates.length > 0) {
    const mostRecentActivity = new Date(
      Math.max(...allDates.map((d) => d.getTime()))
    );
    const now = Date.now();
    const monthsAgo =
      (now - mostRecentActivity.getTime()) /
      (1000 * 60 * 60 * 24 * 30);

    if (monthsAgo <= 3) {
      freshnessScore = SCORING_WEIGHTS.FRESHNESS; // Very Active
    } else if (monthsAgo <= 6) {
      freshnessScore = 30; // Active
    } else if (monthsAgo <= 12) {
      freshnessScore = 15; // Maintained
    } else {
      freshnessScore = 0; // Stale
    }
  } else {
    // No activity data at all; give a small neutral score instead of 0
    freshnessScore = 10;
  }

  // --- 3. ISSUE HEALTH (Max 25 pts) ---
  const allIssues = repoList.flatMap((repo) => repo.issues ?? []);
  const openIssues = allIssues.filter(
    (issue) => issue.state?.toLowerCase() === "open"
  ).length;
  const closedIssues = allIssues.filter(
    (issue) => issue.state?.toLowerCase() === "closed"
  ).length;
  const totalIssues = allIssues.length;

  let issueScore = 0;
  if (totalIssues > 0) {
    const closedPercentage = (closedIssues / totalIssues) * 100;
    if (closedPercentage >= 90) {
      issueScore = SCORING_WEIGHTS.ISSUES; // Excellent
    } else if (closedPercentage >= 75) {
      issueScore = 20; // Good
    } else if (closedPercentage >= 50) {
      issueScore = 10; // Okay
    } else {
      issueScore = 0; // Poor
    }
  } else {
    issueScore = 5; // Neutral score if no issues exist
  }

  // --- 4. MILESTONE MANAGEMENT (Max 15 pts) ---
  const allMilestones = repoList.flatMap((repo) => repo.milestones ?? []);
  const openMilestones = allMilestones.filter(
    (m) => m.state?.toLowerCase() === "open"
  );

  let milestoneScore = 0;
  if (allMilestones.length > 0) {
    const hasOverdue = openMilestones.some((m) => {
      const due = safeDate(m.dueOn);
      return due !== null && due.getTime() < Date.now();
    });

    if (hasOverdue) {
      milestoneScore = 0; // Penalize for overdue milestones
    } else if (openMilestones.length > 0) {
      milestoneScore = SCORING_WEIGHTS.MILESTONES; // Actively working on a plan
    } else {
      milestoneScore = 10; // All milestones complete
    }
  } else {
    milestoneScore = 7; // Neutral score, not all projects use them
  }

  const finalScore = Math.round(
    maturityScore + freshnessScore + issueScore + milestoneScore
  );

  let status: HealthScore["status"] = "Stale";
  if (finalScore > 80) {
    status = "Healthy";
  } else if (finalScore > 60) {
    status = "Active";
  } else if (finalScore > 30) {
    status = "Needs Attention";
  }

  return {
    score: finalScore,
    status,
    metrics: {
      maturityScore,
      freshnessScore,
      issueScore,
      milestoneScore,
    },
  };
}
