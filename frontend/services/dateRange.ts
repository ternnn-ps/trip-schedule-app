const monthIndexes: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function formatDisplayDate(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDisplayDate(startDate);
  }

  return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
}

function parseDateSegment(segment: string, fallbackYear?: number) {
  const trimmedSegment = segment.trim();
  const isoMatch = trimmedSegment.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return {
      date: new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))),
      hasYear: true,
    };
  }

  const labelMatch = trimmedSegment.match(/^(\d{1,2})\s+([A-Za-z]+)\s*(\d{4})?$/);

  if (labelMatch) {
    const month = monthIndexes[labelMatch[2].toLowerCase()];
    const year = labelMatch[3] ? Number(labelMatch[3]) : fallbackYear;

    if (month === undefined || year === undefined) {
      return null;
    }

    return {
      date: new Date(Date.UTC(year, month, Number(labelMatch[1]))),
      hasYear: Boolean(labelMatch[3]),
    };
  }

  const fallbackDate = new Date(trimmedSegment);

  if (Number.isNaN(fallbackDate.getTime())) {
    return null;
  }

  return {
    date: fallbackDate,
    hasYear: /\d{4}/.test(trimmedSegment),
  };
}

export function parseTripDateRange(dateRange: string) {
  const [startSegment, endSegment] = dateRange.split(/\s+-\s+/);
  const singleDate = parseDateSegment(dateRange);

  if (!startSegment || !endSegment) {
    return singleDate
      ? {
          startDate: toIsoDate(singleDate.date),
          endDate: toIsoDate(singleDate.date),
        }
      : null;
  }

  const end = parseDateSegment(endSegment);

  if (!end) {
    return null;
  }

  let start = parseDateSegment(startSegment, end.date.getUTCFullYear());

  if (!start) {
    return null;
  }

  if (!start.hasYear && start.date.getTime() > end.date.getTime()) {
    start = {
      date: new Date(Date.UTC(end.date.getUTCFullYear() - 1, start.date.getUTCMonth(), start.date.getUTCDate())),
      hasYear: false,
    };
  }

  return {
    startDate: toIsoDate(start.date),
    endDate: toIsoDate(end.date),
  };
}

export function getTripDurationDays(dateRange: string) {
  const parsedRange = parseTripDateRange(dateRange);

  if (!parsedRange) {
    return null;
  }

  const start = new Date(`${parsedRange.startDate}T00:00:00Z`);
  const end = new Date(`${parsedRange.endDate}T00:00:00Z`);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const durationDays = Math.round((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;

  return durationDays > 0 ? durationDays : null;
}
