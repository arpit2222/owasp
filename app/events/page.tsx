// app/events/page.tsx

import { Nest } from "owasp-nest";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface EventSummary {
  id: string;
  name: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
}

async function getEvents(): Promise<EventSummary[]> {
  try {
    const nest = new Nest({
      apiKey: process.env.NEST_API_KEY ?? "",
    });

    const response = await (nest as any).events.listEvents({});
    console.log("events response",response);

    const items: unknown = (response as any)?.items
      ?? (response as any)?.data?.items
      ?? [];

    if (!Array.isArray(items)) {
      console.error("Unexpected events response shape from Nest API", { response });
      return [];
    }

    const events: EventSummary[] = (items as any[])
      .map((item) => ({
        id: item.id ?? item.slug ?? item.key ?? item.name,
        name: item.name ?? item.title ?? "Untitled event",
        startsAt: item.startsAt ?? item.startAt ?? item.startDate,
        endsAt: item.endsAt ?? item.endAt ?? item.endDate,
        location: item.location ?? item.city ?? item.country,
      }))
      .filter((e) => typeof e.id === "string" && typeof e.name === "string");

    return events;
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return [];
  }
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          OWASP Events
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          Discover upcoming and past OWASP events.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {events.map((event) => (
            <Card key={event.id} className="flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">
                  {event.name}
                </CardTitle>
                {(event.startsAt || event.location) && (
                  <CardDescription>
                    {event.startsAt && (
                      <span>
                        {new Date(event.startsAt).toLocaleDateString()}
                      </span>
                    )}
                    {event.location && (
                      <span className="ml-2 text-xs uppercase tracking-wide">
                        {event.location}
                      </span>
                    )}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
                {event.startsAt && (
                  <div>
                    <span className="font-semibold">Starts:</span>{" "}
                    {new Date(event.startsAt).toLocaleString()}
                  </div>
                )}
                {event.endsAt && (
                  <div>
                    <span className="font-semibold">Ends:</span>{" "}
                    {new Date(event.endsAt).toLocaleString()}
                  </div>
                )}
                <div className="mt-3">
                  <Link
                    href={`/events/${encodeURIComponent(event.id)}`}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    View event
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
