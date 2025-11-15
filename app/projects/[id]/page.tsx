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

interface ProjectDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface RepositorySummary {
  id: string;
  name: string;
  provider?: string;
  url?: string;
}

interface IssueSummary {
  id: string;
  title: string;
  state?: string;
  url?: string;
  raw: any;
}

interface MilestoneSummary {
  id: string;
  title: string;
  state?: string;
  dueOn?: string;
  raw: any;
}

interface ReleaseSummary {
  id: string;
  tagName: string;
  name?: string;
  createdAt?: string;
  publishedAt?: string;
  url?: string;
  raw: any;
}

interface RepositoryWithMeta extends RepositorySummary {
  issues: IssueSummary[];
  milestones: MilestoneSummary[];
  releases: ReleaseSummary[];
}

async function getProject(nest: NestCore, projectId: string) {
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

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {project.name}
            </CardTitle>
            {project.level && (
              <Badge className="mt-2 w-fit">{project.level}</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            {project.key && (
              <div>
                <span className="font-semibold">Key:</span> {project.key}
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
          </CardContent>
        </Card>

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
