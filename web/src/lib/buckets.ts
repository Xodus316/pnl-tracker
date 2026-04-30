import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  parseISO,
  format,
} from "date-fns";
import type { Period } from "../api/client";

export function bucketRange(
  bucket: string,
  period: Period,
): { from: string; to: string } {
  const start = parseISO(bucket);
  let end: Date;
  switch (period) {
    case "day":
      end = start;
      break;
    case "week":
      end = endOfWeek(start, { weekStartsOn: 1 });
      break;
    case "month":
      end = endOfMonth(start);
      break;
    case "year":
      end = endOfYear(start);
      break;
  }
  return {
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
  };
}
