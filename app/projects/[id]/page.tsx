// app/projects/[id]/page.tsx

import { NestCore } from "owasp-nest/core.js";
import { projectsGetProject } from "owasp-nest/funcs/projectsGetProject.js";
import { repositoriesListRepositories } from "owasp-nest/funcs/repositoriesListRepositories.js";
import { issuesListIssues } from "owasp-nest/funcs/issuesListIssues.js";
import { milestonesListMilestones } from "owasp-nest/funcs/milestonesListMilestones.js";
import { releasesListReleases } from "owasp-nest/funcs/releasesListReleases.js";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  Project,
  RepositorySummary,
  IssueSummary,
  MilestoneSummary,
  ReleaseSummary,
  RepositoryWithMeta,
} from "@/app/lib/types";
import { calculateProjectHealth } from "@/app/lib/health";

interface ProjectDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case "Healthy":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "Active":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
    case "Needs Attention":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "Stale":
    default:
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  }
}

function getScoreTextClasses(status: string): string {
  switch (status) {
    case "Healthy":
      return "text-emerald-600 dark:text-emerald-300";
    case "Active":
      return "text-blue-600 dark:text-blue-300";
    case "Needs Attention":
      return "text-amber-600 dark:text-amber-300";
    case "Stale":
    default:
      return "text-red-600 dark:text-red-300";
  }
}

function getMetricTextClasses(score: number, max: number): string {
  if (max <= 0) return "";
  const ratio = score / max;

  if (ratio >= 0.75) {
    return "text-emerald-600 dark:text-emerald-300";
  }
  if (ratio >= 0.4) {
    return "text-amber-600 dark:text-amber-300";
  }
  return "text-red-600 dark:text-red-300";
}

function buildSparklinePath(dates: (string | Date | undefined)[]): string | null {
  const parsed = dates
    .map((d) => (d ? new Date(d) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));

  if (parsed.length === 0) return null;

  const sorted = parsed.sort((a, b) => a.getTime() - b.getTime());
  const min = sorted[0].getTime();
  const max = sorted[sorted.length - 1].getTime();
  const range = max - min || 1;

  const width = 80;
  const height = 24;

  const points = sorted.map((d, index) => {
    const x = (index / Math.max(sorted.length - 1, 1)) * width;
    const t = (d.getTime() - min) / range;
    const y = height - t * height;
    return { x, y };
  });

  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

function buildIssuePieSegments(open: number, closed: number, other: number) {
  const total = open + closed + other;
  if (total <= 0) return null;

  const radius = 12;
  const circumference = 2 * Math.PI * radius;

  const openFrac = open / total;
  const closedFrac = closed / total;
  const otherFrac = other / total;

  const openLen = openFrac * circumference;
  const closedLen = closedFrac * circumference;
  const otherLen = otherFrac * circumference;

  return {
    radius,
    circumference,
    segments: [
      { len: openLen, color: "stroke-blue-500" },
      { len: closedLen, color: "stroke-emerald-500" },
      { len: otherLen, color: "stroke-amber-400" },
    ],
  };
}

async function getProject(nest: NestCore, projectId: string): Promise<Project | null> {
  const res = await projectsGetProject(nest, {
    projectId,
  });
  if (!res.ok) {
    console.error("projectsGetProject failed:", res.error);
    return null;
  }

  return res.value;
}

async function getProjectRepositories(nest: NestCore): Promise<RepositorySummary[]> {
  const res = await repositoriesListRepositories(nest, {
    organizationId: "OWASP",
  });

  if (!res.ok) {
    console.error("repositoriesListRepositories failed:", res.error);
    return [];
  }

  const value: any = res.value;
  const items: unknown = value?.items ?? value?.data?.items ?? [];

  if (!Array.isArray(items)) {
    console.error("Unexpected repositories list shape", { value });
    return [];
  }

  return (items as any[])
    .map((item) => ({
      id: item.id ?? item.slug ?? item.key ?? item.name,
      name: item.name,
      provider: item.provider,
      url: item.url ?? item.htmlUrl ?? item.webUrl,
    }))
    .filter((repo) => typeof repo.id === "string" && typeof repo.name === "string");
}

async function getIssuesForRepository(
  nest: NestCore,
  repoName: string
): Promise<IssueSummary[]> {
  const res = await issuesListIssues(nest, {
    organization: "OWASP",
    repository: repoName,
  });

  if (!res.ok) {
    console.error("issuesListIssues failed:", res.error);
    return [];
  }

  const value: any = res.value;
  const items: unknown = value?.items ?? value?.data?.items ?? [];

  if (!Array.isArray(items)) {
    console.error("Unexpected issues list shape", { value });
    return [];
  }

  return (items as any[])
    .map((item) => {
      const id =
        item.id ?? item.number ?? item.key ?? item.title ?? Math.random().toString();
      const title = item.title ?? item.name ?? `Issue ${id}`;
      return {
        id: String(id),
        title,
        state: item.state ?? item.status,
        url: item.url ?? item.htmlUrl ?? item.webUrl,
        raw: item,
      } as IssueSummary;
    });
}

async function getMilestonesForRepository(
  nest: NestCore,
  repoName: string
): Promise<MilestoneSummary[]> {
  const res = await milestonesListMilestones(nest, {
    organization: "OWASP",
    repository: repoName,
  });
  console.log(
    `[Nest] milestonesListMilestones response for ${repoName}`,
    JSON.stringify(res, null, 2)
  );

  if (!res.ok) {
    console.error("milestonesListMilestones failed:", res.error);
    return [];
  }

  const value: any = res.value;
  const items: unknown = value?.items ?? value?.data?.items ?? [];

  if (!Array.isArray(items)) {
    console.error("Unexpected milestones list shape", { value });
    return [];
  }

  return (items as any[])
    .map((item) => {
      const id = item.id ?? item.number ?? item.key ?? item.title ?? Math.random().toString();
      const title = item.title ?? item.name ?? `Milestone ${id}`;
      return {
        id: String(id),
        title,
        state: item.state ?? item.status,
        dueOn: item.dueOn ?? item.dueDate,
        raw: item,
      } as MilestoneSummary;
    });
}

async function getReleasesForRepository(
  nest: NestCore,
  repoName: string
): Promise<ReleaseSummary[]> {
  const res = await releasesListReleases(nest, {
    organization: "OWASP",
    repository: repoName,
  });

  if (!res.ok) {
    console.error("releasesListReleases failed:", res.error);
    return [];
  }

  const value: any = res.value;
  const items: unknown = value?.items ?? value?.data?.items ?? [];

  if (!Array.isArray(items)) {
    console.error("Unexpected releases list shape", { value });
    return [];
  }

  return (items as any[]).map((item) => {
    const id =
      item.id ?? item.tagName ?? item.name ?? Math.random().toString();
    return {
      id: String(id),
      tagName: item.tagName ?? item.name ?? `release-${id}`,
      name: item.name,
      createdAt: item.createdAt,
      publishedAt: item.publishedAt,
      url: item.url ?? item.htmlUrl ?? item.webUrl,
      raw: item,
    } as ReleaseSummary;
  });
}

async function getRepositoriesWithMeta(nest: NestCore): Promise<RepositoryWithMeta[]> {
  const repositories = await getProjectRepositories(nest);

  const enriched = await Promise.all(
    repositories.map(async (repo) => {
      const [issues, milestones, releases] = await Promise.all([
        getIssuesForRepository(nest, repo.name),
        getMilestonesForRepository(nest, repo.name),
        getReleasesForRepository(nest, repo.name),
      ]);

      return {
        ...repo,
        issues,
        milestones,
        releases,
      };
    })
  );

  return enriched;
}

export default async function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const { id } = await params;
  const nest = new NestCore({
    apiKey: process.env["NEST_API_KEY"] ?? "",
  });

  const project = await getProject(nest, id);
  const repositories = await getRepositoriesWithMeta(nest);

  if (!project) {
    notFound();
  }

  const health = calculateProjectHealth(project as Project, repositories);

   const allIssues = repositories.flatMap((repo) => repo.issues ?? []);
   const aggregateOpenIssues = allIssues.filter(
     (issue) => issue.state?.toLowerCase() === "open"
   ).length;
   const aggregateClosedIssues = allIssues.filter(
     (issue) => issue.state?.toLowerCase() === "closed"
   ).length;
   const aggregateOtherIssues = allIssues.length - aggregateOpenIssues - aggregateClosedIssues;

   const aggregateMilestoneDates = repositories.flatMap((repo) =>
     (repo.milestones ?? []).map((m) => m.dueOn)
   );
   const aggregateReleaseDates = repositories.flatMap((repo) =>
     (repo.releases ?? []).map((r) => r.publishedAt ?? r.createdAt)
   );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                {project.name ?? "Project"}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="relative group">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-[10px] cursor-default">
                    i
                  </span>
                  <div className="absolute right-0 z-10 mt-2 w-64 rounded-md bg-white p-3 text-[11px] leading-snug shadow-lg ring-1 ring-black/5 opacity-0 group-hover:opacity-100 transition-opacity dark:bg-gray-900 dark:text-gray-200">
                    Overall health is a weighted blend of maturity (project level),
                    freshness (recent releases and updates), issue closure ratio, and
                    milestone planning/overdue status.
                  </div>
                </div>
              </div>
            </div>
            {project.level && (
              <Badge className="mt-2 w-fit">{project.level}</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className={"text-3xl font-bold " + getScoreTextClasses(health.status)}
              >
                {health.score}
              </span>
              <span
                className={
                  "px-2 py-0.5 rounded-full text-xs font-semibold " +
                  getStatusBadgeClasses(health.status)
                }
              >
                {health.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm">
              <div>
                <div className="font-semibold">Maturity</div>
                <div
                  className={getMetricTextClasses(
                    health.metrics.maturityScore,
                    20
                  )}
                >
                  {health.metrics.maturityScore} / 20
                </div>
              </div>
              <div>
                <div className="font-semibold">Freshness</div>
                <div
                  className={getMetricTextClasses(
                    health.metrics.freshnessScore,
                    40
                  )}
                >
                  {health.metrics.freshnessScore} / 40
                </div>
              </div>
              <div>
                <div className="font-semibold">Issues</div>
                <div
                  className={getMetricTextClasses(
                    health.metrics.issueScore,
                    25
                  )}
                >
                  {health.metrics.issueScore} / 25
                </div>
              </div>
              <div>
                <div className="font-semibold">Milestones</div>
                <div
                  className={getMetricTextClasses(
                    health.metrics.milestoneScore,
                    15
                  )}
                >
                  {health.metrics.milestoneScore} / 15
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mt-2 space-y-1">
              {project.key && (
                <div>
                  <span className="font-semibold">Key:</span>{" "}
                  {String(project.key)}
                </div>
              )}
              {project.createdAt && (
                <div>
                  <span className="font-semibold">Created:</span>{" "}
                  {new Date(project.createdAt).toLocaleString()}
                </div>
              )}
              {project.updatedAt && (
                <div>
                  <span className="font-semibold">Updated:</span>{" "}
                  {new Date(project.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {(aggregateMilestoneDates.length > 0 ||
          aggregateReleaseDates.length > 0 ||
          allIssues.length > 0) && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Project activity overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs md:text-sm text-gray-700 dark:text-gray-300">
              {allIssues.length > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold mb-1">Issues (all repositories)</div>
                    <div className="space-x-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-blue-500" /> Open
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Closed
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-400" /> Other
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const pie = buildIssuePieSegments(
                      aggregateOpenIssues,
                      aggregateClosedIssues,
                      aggregateOtherIssues
                    );
                    if (!pie) return null;
                    let offset = 0;
                    return (
                      <svg
                        width={40}
                        height={40}
                        viewBox="0 0 40 40"
                        className="shrink-0"
                      >
                        <g transform="translate(20,20)">
                          {pie.segments.map((seg, idx) => {
                            const strokeDasharray = `${seg.len} ${pie.circumference}`;
                            const strokeDashoffset = -offset;
                            offset += seg.len;
                            return (
                              <circle
                                key={idx}
                                r={pie.radius}
                                className={seg.color}
                                strokeWidth={8}
                                fill="transparent"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                              />
                            );
                          })}
                        </g>
                      </svg>
                    );
                  })()}
                </div>
              )}

              {aggregateMilestoneDates.length > 0 && (
                <div className="space-y-1">
                  <div className="font-semibold">Milestones over time (all repositories)</div>
                  {(() => {
                    const path = buildSparklinePath(aggregateMilestoneDates);
                    if (!path) return null;
                    return (
                      <svg
                        width="100%"
                        height={28}
                        viewBox="0 0 80 24"
                        className="text-emerald-500"
                      >
                        <path
                          d={path}
                          className="stroke-current"
                          strokeWidth={2}
                          fill="none"
                        />
                      </svg>
                    );
                  })()}
                </div>
              )}

              {aggregateReleaseDates.length > 0 && (
                <div className="space-y-1">
                  <div className="font-semibold">Releases over time (all repositories)</div>
                  {(() => {
                    const path = buildSparklinePath(aggregateReleaseDates);
                    if (!path) return null;
                    return (
                      <svg
                        width="100%"
                        height={28}
                        viewBox="0 0 80 24"
                        className="text-blue-500"
                      >
                        <path
                          d={path}
                          className="stroke-current"
                          strokeWidth={2}
                          fill="none"
                        />
                      </svg>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Project details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
              {Object.entries(project).map(([key, value]) => (
                <div
                  key={key}
                  className="border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-white/60 dark:bg-gray-900/40"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    {key}
                  </div>
                  <div className="text-xs md:text-sm break-words">
                    {typeof value === "object" && value !== null
                      ? JSON.stringify(value, null, 2)
                      : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Repositories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {repositories.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No repositories found for this organization. Check the console log for the raw response.
              </p>
            ) : (
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                {repositories.map((repo) => (
                  <div
                    key={repo.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-white/60 dark:bg-gray-900/40 space-y-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="font-semibold">{repo.name}</div>
                        {repo.provider && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Provider: {repo.provider}
                          </div>
                        )}
                      </div>
                      {repo.url && (
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Open repository
                        </a>
                      )}
                    </div>

                    <div className="space-y-4">
                      <section>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                          Milestones
                        </div>
                        {repo.milestones.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            No milestones.
                          </p>
                        ) : (
                          <>
                            <div className="mb-1">
                              {(() => {
                                const path = buildSparklinePath(
                                  repo.milestones.map((m) => m.dueOn)
                                );
                                if (!path) return null;
                                return (
                                  <svg
                                    width="100%"
                                    height={24}
                                    viewBox="0 0 80 24"
                                    className="text-emerald-500"
                                  >
                                    <path
                                      d={path}
                                      className="stroke-current"
                                      strokeWidth={2}
                                      fill="none"
                                    />
                                  </svg>
                                );
                              })()}
                            </div>
                            <ul className="space-y-1 text-xs md:text-sm">
                              {repo.milestones.map((m) => (
                                <li key={m.id} className="border border-gray-200 dark:border-gray-700 rounded px-2 py-1 space-y-1">
                                  <div className="font-medium">{m.title}</div>
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                    {m.state && <span>Status: {m.state}</span>}
                                    {m.dueOn && (
                                      <span>
                                        {m.state ? " · " : ""}
                                        Due: {new Date(m.dueOn).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </section>

                      <section>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                          Issues
                        </div>
                        {repo.issues.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            No issues.
                          </p>
                        ) : (
                          <>
                            {(() => {
                              const open = repo.issues.filter(
                                (i) => i.state?.toLowerCase() === "open"
                              ).length;
                              const closed = repo.issues.filter(
                                (i) => i.state?.toLowerCase() === "closed"
                              ).length;
                              const other = repo.issues.length - open - closed;
                              const pie = buildIssuePieSegments(open, closed, other);
                              if (!pie) return null;
                              let offset = 0;
                              return (
                                <div className="flex items-center justify-between mb-2 gap-3">
                                  <div className="space-x-2 text-[11px] text-gray-500 dark:text-gray-400">
                                    <span className="inline-flex items-center gap-1">
                                      <span className="h-2 w-2 rounded-full bg-blue-500" /> Open
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Closed
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <span className="h-2 w-2 rounded-full bg-amber-400" /> Other
                                    </span>
                                  </div>
                                  <svg
                                    width={36}
                                    height={36}
                                    viewBox="0 0 40 40"
                                    className="shrink-0"
                                  >
                                    <g transform="translate(20,20)">
                                      {pie.segments.map((seg, idx) => {
                                        const strokeDasharray = `${seg.len} ${pie.circumference}`;
                                        const strokeDashoffset = -offset;
                                        offset += seg.len;
                                        return (
                                          <circle
                                            key={idx}
                                            r={pie.radius}
                                            className={seg.color}
                                            strokeWidth={8}
                                            fill="transparent"
                                            strokeDasharray={strokeDasharray}
                                            strokeDashoffset={strokeDashoffset}
                                          />
                                        );
                                      })}
                                    </g>
                                  </svg>
                                </div>
                              );
                            })()}
                            <ul className="space-y-1 text-xs md:text-sm">
                              {repo.issues.map((issue) => (
                                <li key={issue.id} className="border border-gray-200 dark:border-gray-700 rounded px-2 py-1 space-y-1">
                                  <div className="flex justify-between gap-2">
                                    <div>
                                      <div className="font-medium">{issue.title}</div>
                                      {issue.state && (
                                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                          Status: {issue.state}
                                        </div>
                                      )}
                                    </div>
                                    {issue.url && (
                                      <a
                                        href={issue.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="self-center text-[11px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                      >
                                        Open
                                      </a>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </section>

                      <section>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                          Releases
                        </div>
                        {repo.releases.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            No releases.
                          </p>
                        ) : (
                          <>
                            <div className="mb-1">
                              {(() => {
                                const path = buildSparklinePath(
                                  repo.releases.map((rel) => rel.publishedAt ?? rel.createdAt)
                                );
                                if (!path) return null;
                                return (
                                  <svg
                                    width="100%"
                                    height={24}
                                    viewBox="0 0 80 24"
                                    className="text-blue-500"
                                  >
                                    <path
                                      d={path}
                                      className="stroke-current"
                                      strokeWidth={2}
                                      fill="none"
                                    />
                                  </svg>
                                );
                              })()}
                            </div>
                            <ul className="space-y-1 text-xs md:text-sm">
                              {repo.releases.map((rel) => (
                                <li
                                  key={rel.id}
                                  className="border border-gray-200 dark:border-gray-700 rounded px-2 py-1 space-y-1"
                                >
                                  <div className="flex justify-between gap-2">
                                    <div>
                                      <div className="font-medium">{rel.tagName}</div>
                                      {rel.name && (
                                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                          {rel.name}
                                        </div>
                                      )}
                                      {(rel.createdAt || rel.publishedAt) && (
                                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                          {rel.createdAt && (
                                            <span>
                                              Created: {new Date(rel.createdAt).toLocaleDateString()}
                                            </span>
                                          )}
                                          {rel.publishedAt && (
                                            <span>
                                              {rel.createdAt ? " · " : ""}
                                              Published: {new Date(rel.publishedAt).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {rel.url && (
                                      <a
                                        href={rel.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="self-center text-[11px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                      >
                                        Open
                                      </a>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </section>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
