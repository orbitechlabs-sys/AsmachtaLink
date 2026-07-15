export function DateRange({ start, end }: { start: string; end?: string | null }) {
  return (
    <span dir="ltr" className="inline-block">
      {start}
      {end ? ` – ${end}` : ""}
    </span>
  );
}
