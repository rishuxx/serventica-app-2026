const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sept',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Formats a booking date & time to the exact format:
 * Example: "22 Sept 2026 • 11:34"
 */
export function formatBookingExactDateTime(
  scheduledStartTime?: string | null,
  scheduledDate?: string | null,
  createdAt?: string | null
): string {
  let targetDate: Date | null = null;

  // 1. Try scheduledStartTime if it's a valid date string
  if (scheduledStartTime && typeof scheduledStartTime === 'string') {
    const isIsoOrDate =
      scheduledStartTime.includes('T') ||
      (scheduledStartTime.includes('-') && scheduledStartTime.includes(':'));
    if (isIsoOrDate) {
      const d = new Date(scheduledStartTime);
      if (!isNaN(d.getTime())) {
        targetDate = d;
      }
    }
  }

  // 2. Try createdAt
  if (!targetDate && createdAt && typeof createdAt === 'string') {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      targetDate = d;
    }
  }

  // 3. Try scheduledDate
  if (
    !targetDate &&
    scheduledDate &&
    typeof scheduledDate === 'string' &&
    scheduledDate.toLowerCase() !== 'today'
  ) {
    const d = new Date(scheduledDate);
    if (!isNaN(d.getTime())) {
      targetDate = d;
    }
  }

  // 4. Default fallback to current local date
  if (!targetDate) {
    targetDate = new Date();
  }

  const day = targetDate.getDate();
  const month = SHORT_MONTHS[targetDate.getMonth()];
  const year = targetDate.getFullYear();
  const hours = String(targetDate.getHours()).padStart(2, '0');
  const minutes = String(targetDate.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year} • ${hours}:${minutes}`;
}
