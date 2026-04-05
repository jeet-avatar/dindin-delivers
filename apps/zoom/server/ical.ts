function formatIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

interface MeetingForIcs {
  ics_uid: string;
  title: string;
  scheduled_at: Date;
  duration_min: number;
  room_code: string;
  host_email: string;
  guest_email: string;
}

export function buildIcs(meeting: MeetingForIcs, method: 'REQUEST' | 'CANCEL'): string {
  const start = new Date(meeting.scheduled_at);
  const end = new Date(start.getTime() + meeting.duration_min * 60_000);
  const joinUrl = `https://meet.vibingticket.com/?room=${meeting.room_code}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zietra Meet//EN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${meeting.ics_uid}`,
    `SUMMARY:${meeting.title}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `DESCRIPTION:Join: ${joinUrl}\\nRoom code: ${meeting.room_code}`,
    `URL:${joinUrl}`,
    `ORGANIZER:mailto:${meeting.host_email}`,
    `ATTENDEE:mailto:${meeting.guest_email}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
