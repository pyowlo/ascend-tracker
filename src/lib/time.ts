export const PH_TIME_ZONE = "Asia/Manila";

function getParts(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

export function getCurrentPHDateKey() {
  const p = getParts(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

export function getCurrentPHMonthKey() {
  return getCurrentPHDateKey().slice(0, 7);
}

export function getCurrentPHIsoString() {
  const p = getParts(new Date());
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+08:00`;
}

export function formatDateInPH(value: Date | string | number) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: PH_TIME_ZONE,
  });
}

export function formatDateTimeInPH(value: Date | string | number) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PH_TIME_ZONE,
  });
}

