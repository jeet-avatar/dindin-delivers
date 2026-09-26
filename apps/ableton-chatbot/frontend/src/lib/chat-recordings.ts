import type { ProductionAction } from "@/components/ProductionLog";

// Ownership comes from the returned recording ID, never a mutable track name/index.
export function messageRecordingIds(messages: { toolCalls?: ProductionAction[] }[], revisions: { id: string; supersedes?: string }[] = []): string[][] {
  const seen = new Set<string>();
  const grouped = messages.map(message => (message.toolCalls || []).flatMap(action => {
    const id = action.result?.recording?.id;
    if (!id || !/^[a-f0-9]{32}$/.test(id) || seen.has(id)) return [];
    seen.add(id);
    return [id];
  }));
  // Recover level auditions even if their response was interrupted or the tab refreshed.
  // Explicit message ownership wins over inherited ownership from a prior version.
  let changed = true;
  while (changed) {
    changed = false;
    for (const revision of revisions) {
      if (seen.has(revision.id) || !/^[a-f0-9]{32}$/.test(revision.id) || !revision.supersedes) continue;
      const parent = grouped.find(ids => ids.includes(revision.supersedes!));
      if (parent) { parent.push(revision.id); seen.add(revision.id); changed = true; }
    }
  }
  return grouped;
}
