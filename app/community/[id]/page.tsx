// app/community/[id]/page.tsx

import { NestCore } from "owasp-nest/core.js";
import { communityGetMember } from "owasp-nest/funcs/communityGetMember.js";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CommunityMemberDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getMember(memberId: string): Promise<any> {
  const nest = new NestCore({
    apiKey: process.env["NEST_API_KEY"] ?? "",
  });

  const res = await communityGetMember(nest, {
    memberId,
  });

  if (!res.ok) {
    console.error("communityGetMember failed:", res.error);
    return null;
  }

  return res.value;
}

export default async function CommunityMemberDetailsPage({ params }: CommunityMemberDetailsPageProps) {
  const { id } = await params;
  const member = await getMember(id);

  if (!member) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {member.name ?? member.username ?? "Community member"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            {(member as any).role && (
              <div>
                <span className="font-semibold">Role:</span>{" "}
                {String((member as any).role)}
              </div>
            )}
            {member.country && (
              <div>
                <span className="font-semibold">Country:</span>{" "}
                {String(member.country)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Member details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
              {Object.entries(member).map(([key, value]) => (
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
