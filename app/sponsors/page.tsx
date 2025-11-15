// app/sponsors/page.tsx

import { Nest } from "owasp-nest";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface SponsorSummary {
  id: string;
  name: string;
  level?: string;
  websiteUrl?: string;
}

async function getSponsors(): Promise<SponsorSummary[]> {
  try {
    const nest = new Nest({
      apiKey: process.env.NEST_API_KEY ?? "",
    });

    const response = await (nest as any).sponsors.listSponsors({});

    const items: unknown = (response as any)?.items
      ?? (response as any)?.data?.items
      ?? [];

    if (!Array.isArray(items)) {
      console.error("Unexpected sponsors response shape from Nest API", { response });
      return [];
    }

    const sponsors: SponsorSummary[] = (items as any[])
      .map((item) => ({
        id: item.id ?? item.slug ?? item.key ?? item.name,
        name: item.name,
        level: item.level ?? item.tier,
        websiteUrl: item.websiteUrl ?? item.url,
      }))
      .filter((s) => typeof s.id === "string" && typeof s.name === "string");

    return sponsors;
  } catch (error) {
    console.error("Failed to fetch sponsors:", error);
    return [];
  }
}

export default async function SponsorsPage() {
  const sponsors = await getSponsors();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          OWASP Sponsors
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          Learn about organizations sponsoring OWASP.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {sponsors.map((sponsor) => (
            <Card key={sponsor.id} className="flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">
                  {sponsor.name}
                </CardTitle>
                {sponsor.level && (
                  <CardDescription>
                    {sponsor.level}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
                {sponsor.websiteUrl && (
                  <div>
                    <a
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                    >
                      Visit website
                    </a>
                  </div>
                )}
                <div className="mt-3">
                  <Link
                    href={`/sponsors/${encodeURIComponent(sponsor.id)}`}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    View sponsor
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
