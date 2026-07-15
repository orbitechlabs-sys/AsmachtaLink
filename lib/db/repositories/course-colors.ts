import { execute, query, queryOne } from "@/lib/db/client";
import { paletteColorAt } from "@/lib/utils/cert-colors";

/** Course name -> assigned color, shared by template-backed and ad-hoc
 * certifications so every instance of a course colors the same everywhere. */
export async function getCourseColorMap(): Promise<Map<string, string>> {
  const rows = await query<{
    name: string;
    color_hex: string;
  }>("SELECT name, color_hex FROM course_colors");
  return new Map(rows.map((r) => [r.name, r.color_hex]));
}

/** Looks up the color already assigned to this course name, or hands out the
 * next unused slot in the distinct-color palette and persists it. */
export async function getOrAssignCourseColor(name: string): Promise<string> {
  const existing = await queryOne<{ color_hex: string }>(
    "SELECT color_hex FROM course_colors WHERE name = $1",
    [name]
  );
  if (existing) return existing.color_hex;

  const { count } = (await queryOne<{ count: number }>(
    "SELECT COUNT(*)::int as count FROM course_colors"
  ))!;
  const color = paletteColorAt(count);
  await execute("INSERT INTO course_colors (name, color_hex) VALUES ($1, $2)", [name, color]);
  return color;
}
