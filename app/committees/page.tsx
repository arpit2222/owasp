// app/committees/page.tsx

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

interface Committee {
  id: string;
  name: string;
  kind?: string;
  createdAt?: string;
  updatedAt?: string;
}

async function getCommittees(): Promise<Committee[]> {
  try {
    const nest = new Nest({
      apiKey: process.env.NEST_API_KEY ?? "",
    });

    const response = await nest.committees.listCommittees({});

    const items: unknown = (response as any)?.items
      ?? (response as any)?.data?.items
      ?? [];

    if (!Array.isArray(items)) {
      console.error("Unexpected committees response shape from Nest API", { response });
      return [];
    }

    const committees: Committee[] = items
      .map((item: any) => ({
        id: item.id ?? item.slug ?? item.key ?? item.name,
        name: item.name,
        kind: item.kind,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))
      .filter((c) => typeof c.id === "string" && typeof c.name === "string");

    return committees;
  } catch (error) {
    console.error("Failed to fetch committees:", error);
    return [];
  }
}

export default async function CommitteesPage() {
  const committees = await getCommittees();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          OWASP Committees
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          Explore OWASP committees.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {committees.map((committee) => (
            <Card key={committee.id} className="flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">
                  {committee.name}
                </CardTitle>
                {committee.kind && (
                  <CardDescription>
                    <Badge>{committee.kind}</Badge>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
                {committee.createdAt && (
                  <div>
                    <span className="font-semibold">Created:</span>{" "}
                    {new Date(committee.createdAt).toLocaleDateString()}
                  </div>
                )}
                {committee.updatedAt && (
                  <div>
                    <span className="font-semibold">Updated:</span>{" "}
                    {new Date(committee.updatedAt).toLocaleDateString()}
                  </div>
                )}
                <div className="mt-3">
                  <Link
                    href={`/committees/${encodeURIComponent(committee.id)}`}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    View committee
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
