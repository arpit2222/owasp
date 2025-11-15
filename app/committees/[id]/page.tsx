// app/committees/[id]/page.tsx

import { NestCore } from "owasp-nest/core.js";
import { committeesGetCommittee } from "owasp-nest/funcs/committeesGetCommittee.js";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CommitteeDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getCommittee(committeeId: string) {
  const nest = new NestCore({
    apiKey: process.env["NEST_API_KEY"] ?? "",
  });

  const res = await committeesGetCommittee(nest, {
    committeeId,
  });

  if (!res.ok) {
    console.error("committeesGetCommittee failed:", res.error);
    return null;
  }

  return res.value;
}

export default async function CommitteeDetailsPage({ params }: CommitteeDetailsPageProps) {
  const { id } = await params;
  const committee = await getCommittee(id);

  if (!committee) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {committee.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            {committee.createdAt && (
              <div>
                <span className="font-semibold">Created:</span>{" "}
                {new Date(committee.createdAt).toLocaleString()}
              </div>
            )}
            {committee.updatedAt && (
              <div>
                <span className="font-semibold">Updated:</span>{" "}
                {new Date(committee.updatedAt).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Committee details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
              {Object.entries(committee).map(([key, value]) => (
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
