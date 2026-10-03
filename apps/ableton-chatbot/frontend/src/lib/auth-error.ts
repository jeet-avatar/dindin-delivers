export function authError(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const fields = detail.flatMap(issue => {
      if (!issue || !Array.isArray(issue.loc)) return [];
      return issue.loc.slice(-1);
    });
    if (fields.includes("email")) return "Please enter a valid email address.";
    if (fields.includes("password") || fields.includes("new_password")) return "Please check your password and try again.";
    if (fields.includes("name")) return "Please enter your name.";
  }
  return fallback;
}
