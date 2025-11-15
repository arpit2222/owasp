// app/chapters/page.tsx

import { Nest } from "owasp-nest";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Chapter {
  id: string;
  name: string;
  country?: string;
  region?: string;
  createdAt?: string;
  updatedAt?: string;
}

async function getChapters(): Promise<Chapter[]> {
  try {
    const nest = new Nest({
      apiKey: process.env.NEST_API_KEY ?? "",
    });

    const response = await nest.chapters.listChapters();

    const items: unknown = (response as any)?.items
      ?? (response as any)?.data?.items
      ?? [];

    if (!Array.isArray(items)) {
      console.error("Unexpected chapters response shape from Nest API", { response });
      return [];
    }

    const chapters: Chapter[] = items.map((item: any) => ({
      id: item.id ?? item.slug ?? item.key ?? item.name,
      name: item.name,
      country: item.country,
      region: item.region,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })).filter((c) => typeof c.id === "string" && typeof c.name === "string");

    return chapters;
  } catch (error) {
    console.error("Failed to fetch chapters:", error);
    return [];
  }
}

export default async function ChaptersPage() {
  const chapters = await getChapters();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          OWASP Chapters
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          Explore OWASP chapters around the world.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {chapters.map((chapter) => (
            <Card key={chapter.id} className="flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">
                  {chapter.name}
                </CardTitle>
                {(chapter.country || chapter.region) && (
                  <CardDescription>
                    <Badge>{chapter.country ?? chapter.region}</Badge>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
                {chapter.createdAt && (
                  <div>
                    <span className="font-semibold">Created:</span>{" "}
                    {new Date(chapter.createdAt).toLocaleDateString()}
                  </div>
                )}
                {chapter.updatedAt && (
                  <div>
                    <span className="font-semibold">Updated:</span>{" "}
                    {new Date(chapter.updatedAt).toLocaleDateString()}
                  </div>
                )}
                <div className="mt-3">
                  <Link
                    href={`/chapters/${encodeURIComponent(chapter.id)}`}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    View chapter
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
