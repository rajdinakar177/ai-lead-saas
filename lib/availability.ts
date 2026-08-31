import {
  formatInTimeZone,
  fromZonedTime,
  toZonedTime,
} from "date-fns-tz";

export type Timeline =
  | "Today"
  | "Tomorrow"
  | "This week"
  | "Next week";

export type AvailabilityDay = {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export type GeneratedSlot = {
  label: string;
  scheduledFor: string;
};

function timeToMinutes(time: string) {
  const [hours, minutes] =
    time.split(":").map(Number);

  return hours * 60 + minutes;
}

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

export function getDatesForTimeline(
  timeline: Timeline,
  timezone: string
) {
  const now = new Date();

  const localNow =
    toZonedTime(now, timezone);

  const start =
    cloneDate(localNow);

  start.setHours(0, 0, 0, 0);

  if (timeline === "Today") {
    return [start];
  }

  if (timeline === "Tomorrow") {
    const tomorrow =
      cloneDate(start);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    return [tomorrow];
  }

  if (timeline === "This week") {
    const dates: Date[] = [];

    // Start from today and continue
    // through the end of this week.
    const dayOfWeek =
      start.getDay();

    const daysUntilSunday =
      7 - dayOfWeek;

    for (
      let i = 0;
      i < daysUntilSunday;
      i++
    ) {
      const date =
        cloneDate(start);

      date.setDate(
        start.getDate() + i
      );

      dates.push(date);
    }

    return dates;
  }

  // Next week: Monday → Sunday
  const dayOfWeek =
    start.getDay();

  const daysUntilMonday =
    dayOfWeek === 0
      ? 1
      : 8 - dayOfWeek;

  const nextMonday =
    cloneDate(start);

  nextMonday.setDate(
    start.getDate() +
      daysUntilMonday
  );

  const dates: Date[] = [];

  for (
    let i = 0;
    i < 7;
    i++
  ) {
    const date =
      cloneDate(nextMonday);

    date.setDate(
      nextMonday.getDate() + i
    );

    dates.push(date);
  }

  return dates;
}

function getDayLabel(
  slot: Date,
  now: Date,
  timezone: string
) {
  const slotDate =
    formatInTimeZone(
      slot,
      timezone,
      "yyyy-MM-dd"
    );

  const today =
    formatInTimeZone(
      now,
      timezone,
      "yyyy-MM-dd"
    );

  const tomorrowDate =
    toZonedTime(
      now,
      timezone
    );

  tomorrowDate.setDate(
    tomorrowDate.getDate() + 1
  );

  const tomorrow =
    formatInTimeZone(
      fromZonedTime(
        tomorrowDate,
        timezone
      ),
      timezone,
      "yyyy-MM-dd"
    );

  if (slotDate === today) {
    return "Today";
  }

  if (
    slotDate === tomorrow
  ) {
    return "Tomorrow";
  }

  return formatInTimeZone(
    slot,
    timezone,
    "EEE, MMM d"
  );
}

export function generateSlotsForDate(
  localDate: Date,
  dayAvailability: AvailabilityDay,
  slotDurationMinutes: number,
  bufferMinutes: number,
  timezone: string,
  now: Date = new Date()
): GeneratedSlot[] {
  if (
    !dayAvailability.enabled
  ) {
    return [];
  }

  const startMinutes =
    timeToMinutes(
      dayAvailability.startTime
    );

  const endMinutes =
    timeToMinutes(
      dayAvailability.endTime
    );

  const step =
    slotDurationMinutes +
    bufferMinutes;

  const slots: GeneratedSlot[] =
    [];

  for (
    let minutes =
      startMinutes;

    minutes +
        slotDurationMinutes <=
      endMinutes;

    minutes += step
  ) {
    const hours =
      Math.floor(
        minutes / 60
      );

    const mins =
      minutes % 60;

    const localSlot =
      cloneDate(localDate);

    localSlot.setHours(
      hours,
      mins,
      0,
      0
    );

    const slotUtc =
      fromZonedTime(
        localSlot,
        timezone
      );

    // Never return past slots.
    if (
      slotUtc.getTime() <=
      now.getTime()
    ) {
      continue;
    }

    const dayLabel =
      getDayLabel(
        slotUtc,
        now,
        timezone
      );

    const timeLabel =
      formatInTimeZone(
        slotUtc,
        timezone,
        "h:mm a"
      );

    slots.push({
      label:
        `${dayLabel} · ${timeLabel}`,

      scheduledFor:
        slotUtc.toISOString(),
    });
  }

  return slots;
}

export function getDayName(
  date: Date
) {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return days[
    date.getDay()
  ];
}