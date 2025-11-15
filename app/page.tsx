// app/page.tsx

import { Nest } from "owasp-nest"; // The API SDK
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; //
import { Badge } from "@/components/ui/badge"; //
import Link from "next/link";

interface Project {
  id: string; // derived from API key
  name: string;
  level: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * SERVER-SIDE DATA FETCHING
 * This function runs on the server, never in the browser.
 */
async function getProjects(): Promise<Project[]> {
  try {
    const nest = new Nest({
      apiKey: process.env.NEST_API_KEY?? "", //
    });

    // 1. Fetch all projects from the API (ordered by newest first)
    const response = await nest.projects.listProjects({
      ordering: "-created_at",
    });

    const items: unknown = (response as any)?.items
      ?? (response as any)?.data?.items
      ?? [];

    if (!Array.isArray(items)) {
      console.error("Unexpected projects response shape from Nest API", { response });
      return [];
    }

    const projects: Project[] = items
      .filter((item: any) => {
        return (
          item &&
          typeof item.key === "string" &&
          typeof item.name === "string" &&
          typeof item.level === "string" &&
          item.createdAt &&
          item.updatedAt
        );
      })
      .map((item: any) => ({
        id: item.key,
        name: item.name,
        level: item.level,
        createdAt: new Date(item.createdAt).toISOString(),
        updatedAt: new Date(item.updatedAt).toISOString(),
      }));

    if (projects.length === 0) {
      console.error("No valid projects found in Nest API response", { response });
      return [];
    }

    return projects;

  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return [];
  }
}

/**
 * THE PAGE COMPONENT (Runs on Server)
 */
export default async function Home() {
  const projects = await getProjects();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          OWASP Nest Project Health Monitor
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          A real-time dashboard of all {projects.length} OWASP projects, powered by the Nest API.
        </p>

        {/* Project Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </main>
  );
}

/**
 * THE CARD COMPONENT
 */
function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {project.name}
        </CardTitle>
        <CardDescription>
          <Badge>
            {project.level}
          </Badge>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="flex flex-col text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <span>
            <span className="font-semibold">Created:</span>{" "}
            {new Date(project.createdAt).toLocaleDateString()}
          </span>
          <span>
            <span className="font-semibold">Updated:</span>{" "}
            {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>
        <div className="mt-4">
          <Link
            href={`/projects/${project.id}`}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            View details
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}