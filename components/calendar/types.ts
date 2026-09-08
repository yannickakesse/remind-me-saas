import type { CalendarEventStatus } from "@/types/database";

export interface CalendarEventView {
  id: string;
  activity_id: string;
  schedule_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  status: CalendarEventStatus;
  is_exception: boolean;
  original_starts_at: string | null;
  notes: string | null;
  activity: { color: string | null; name: string } | null;
}
