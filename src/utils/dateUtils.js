/**
 * Formats a time string (e.g. "18:45" or "18:45:00") into 12-hour format with AM/PM (e.g. "06:45 PM").
 * If timeStr is falsy or invalid, returns empty string or original string.
 */
export function formatTime12Hour(timeStr) {
  if (!timeStr) return '';
  const trimmed = String(timeStr).trim();
  if (!trimmed) return '';

  // If already formatted with AM/PM, return as is
  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    if (isNaN(hours)) return trimmed;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;

    const formattedHours = String(hours).padStart(2, '0');
    return `${formattedHours}:${minutes} ${ampm}`;
  }

  return trimmed;
}
