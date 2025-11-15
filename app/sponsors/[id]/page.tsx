// app/sponsors/[id]/page.tsx

import { NestCore } from "owasp-nest/core.js";
import { sponsorsGetSponsor } from "owasp-nest/funcs/sponsorsGetSponsor.js";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SponsorDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getSponsor(sponsorId: string) {
  const nest = new NestCore({
    apiKey: process.env["NEST_API_KEY"] ?? "",
  });

  const res = await sponsorsGetSponsor(nest, {
    sponsorId,
  });

  if (!res.ok) {
    console.error("sponsorsGetSponsor failed:", res.error);
    return null;
  }

  return res.value;
}

export default async function SponsorDetailsPage({ params }: SponsorDetailsPageProps) {
  const { id } = await params;
  const sponsor = await getSponsor(id);

  if (!sponsor) {
    notFound();
  }

  const websiteUrl =
    (sponsor as any).websiteUrl ??
    (sponsor as any).url ??
    (sponsor as any).website ??
    undefined;

  const sponsorLevel = (sponsor as any).level;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {sponsor.name ?? "Sponsor"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            {sponsorLevel && (
              <div>
                <span className="font-semibold">Level:</span>{" "}
                {String(sponsorLevel)}
              </div>
            )}
            {websiteUrl && (
              <div>
                <span className="font-semibold">Website:</span>{" "}
                <a
                  href={String(websiteUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {String(websiteUrl)}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Sponsor details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
              {Object.entries(sponsor).map(([key, value]) => (
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
      </div>
    </main>
  );
}
