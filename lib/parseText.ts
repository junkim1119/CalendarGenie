import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { cleanEvent } from "./validate";
import type { ProposedEvent } from "./types";

const ParsedEvents = z.object({
  events: z.array(
    z.object({
      title: z.string(),
      start: z.string(),
      end: z.string().nullable(),
      allDay: z.boolean(),
      location: z.string().nullable(),
      category: z.enum(["social", "class", "other"]),
      rrule: z.string().nullable(),
    }),
  ),
});

const SYSTEM = `You turn a student's informal notes into calendar events.

Rules:
- start: "YYYY-MM-DDTHH:mm" in the user's local time for timed events, or "YYYY-MM-DD" for all-day events. Never include a timezone offset.
- end: same format as start, or null. For a timed event with no stated end, use null (the app assumes one hour). For an all-day event, end is the last day (inclusive), or null for a single day.
- Resolve relative dates ("Friday", "tomorrow", "next week") against today's date given in the message, choosing the next upcoming occurrence.
- Repeating events: set start to the first occurrence and rrule to an RFC 5545 rule without the "RRULE:" prefix and without DTSTART, e.g. FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261212T235959. The first occurrence must itself match the rule. Use null for one-time events.
- category: "class" for anything academic (lectures, labs, sections, exams, office hours, assignments, study sessions); "social" for time with friends or family, parties, meals out, clubs, games, concerts; "other" for everything else (appointments, work, errands, meetings).
- Keep titles short and put places in location.
- Only include events the notes actually describe. If there are none, return an empty list.`;

export class ParseError extends Error {}

export async function parseEventsFromText(notes: string, timezone: string): Promise<ProposedEvent[]> {
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" }).format(now);

  let response;
  try {
    const client = new Anthropic();
    response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(ParsedEvents) },
      messages: [
        {
          role: "user",
          content: `Today is ${weekday}, ${today}. My timezone is ${timezone}.\n\n<notes>\n${notes}\n</notes>`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new ParseError("Your Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.local.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new ParseError("Too many requests right now. Wait a moment and try again.");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new ParseError("Couldn't reach Claude. Check your internet connection.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new ParseError(`Claude returned an error: ${err.message}`);
    }
    if (err instanceof Error && /api.?key|credentials/i.test(err.message)) {
      throw new ParseError("No Anthropic API key found. Add ANTHROPIC_API_KEY to .env.local and restart the app.");
    }
    throw err;
  }

  if (response.stop_reason === "refusal") throw new ParseError("Claude declined to process that text.");
  if (response.stop_reason === "max_tokens") throw new ParseError("That's too much text at once. Try splitting it up.");
  if (!response.parsed_output) throw new ParseError("Couldn't read events from that text. Try rephrasing.");

  return response.parsed_output.events.map(cleanEvent).filter((e): e is ProposedEvent => e !== null);
}
