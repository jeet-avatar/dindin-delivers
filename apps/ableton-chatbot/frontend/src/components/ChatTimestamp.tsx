export default function ChatTimestamp({ value, label }: { value?: string; label: string }) {
  const date = value ? new Date(value) : null;
  return <span className="block text-xs mt-1 opacity-75">
    {label}: {date && Number.isFinite(date.getTime())
      ? <time dateTime={value} title={date.toISOString()}>{date.toLocaleString(undefined, {
        month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
      })}</time>
      : "Time not recorded"}
  </span>;
}
