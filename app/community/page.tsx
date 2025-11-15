// app/community/page.tsx

import { Nest } from "owasp-nest";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface MemberSummary {
  id: string;
  name: string;
  role?: string;
  country?: string;
}

async function getMembers(): Promise<MemberSummary[]> {
  try {
    const nest = new Nest({
      apiKey: process.env.NEST_API_KEY ?? "",
    });

    const response = await (nest as any).community.listMembers({});

    const items: unknown = (response as any)?.items
      ?? (response as any)?.data?.items
      ?? [];

    if (!Array.isArray(items)) {
      console.error("Unexpected community members response shape from Nest API", { response });
      return [];
    }

    const members: MemberSummary[] = (items as any[])
      .map((item) => {
        const id = item.id;

        if (!id || typeof id !== "string") {
          return null;
        }

        return {
          id,
          name: item.name ?? item.username ?? "Member",
          role: item.role ?? item.title,
          country: item.country,
        } as MemberSummary;
      })
      .filter((m): m is MemberSummary => m !== null);

    return members;
  } catch (error) {
    console.error("Failed to fetch community members:", error);
    return [];
  }
}

export default async function CommunityPage() {
  const members = await getMembers();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          OWASP Community
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          Explore OWASP community members.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {members.map((member) => (
            <Card key={member.id} className="flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">
                  {member.name}
                </CardTitle>
                {(member.role || member.country) && (
                  <CardDescription>
                    {member.role && <span>{member.role}</span>}
                    {member.country && (
                      <span className="ml-2 text-xs uppercase tracking-wide">
                        {member.country}
                      </span>
                    )}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="mt-3">
                  <Link
                    href={`/community/${encodeURIComponent(member.id)}`}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    View member
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
