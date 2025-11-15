// app/events/[id]/page.tsx

import { NestCore } from "owasp-nest/core.js";
import { eventsGetEvent } from "owasp-nest/funcs/eventsGetEvent.js";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface EventDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getEvent(eventId: string) {
  const nest = new NestCore({
    apiKey: process.env["NEST_API_KEY"] ?? "",
  });

  const res = await eventsGetEvent(nest, {
    eventId,
  });

  if (!res.ok) {
    console.error("eventsGetEvent failed:", res.error);
    return null;
  }

  return res.value;
}

export default async function EventDetailsPage({ params }: EventDetailsPageProps) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    notFound();
  }

  const startsAt =
    (event as any).startsAt ?? (event as any).startAt ?? (event as any).startDate;
  const endsAt =
    (event as any).endsAt ?? (event as any).endAt ?? (event as any).endDate;
  const location = (event as any).location;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {(event as any).name ?? (event as any).title ?? "Event"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            {startsAt && (
              <div>
                <span className="font-semibold">Starts:</span>{" "}
                {new Date(startsAt).toLocaleString()}
              </div>
            )}
            {endsAt && (
              <div>
                <span className="font-semibold">Ends:</span>{" "}
                {new Date(endsAt).toLocaleString()}
              </div>
            )}
            {location && (
              <div>
                <span className="font-semibold">Location:</span>{" "}
                {String(location)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Event details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
              {Object.entries(event).map(([key, value]) => (
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
