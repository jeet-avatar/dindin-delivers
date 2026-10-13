import { getAllPosts } from "@/lib/blog";
import { PLANS, formatUsd } from "@/lib/pricing";
import { BASE_URL, LEGAL_NAME, SUPPORT_EMAIL, TRIAL_TERMS } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const lines = [
    "# BeatMind",
    "",
    `> BeatMind is a browser-based AI music-production assistant for Ableton Live, made by ${LEGAL_NAME}. A local Mac Bridge connects production commands to the user's Live Set. Automatic Remix is a separate, approval-first stem-arrangement preview workflow.`,
    "",
    "## Product and availability",
    "",
    `- [BeatMind](${BASE_URL}/): production chat, reference analysis and sound review.`,
    "- Bridge requirements: Apple Silicon Mac, macOS 15 or later, Ableton Live 11 or 12 Standard or Suite, and AbletonOSC. Some native placement features require Live 12 and the BeatMind extension. Windows Bridge support is not available.",
    "- Production chat can inspect a connected Live Set, create supported parts and adjust exposed controls. A checked action or saved plan is not proof of a complete or mastered song. Supported actions depend on the installed Bridge, devices and current set.",
    "- Automatic Remix renders existing reference stems using chosen section order, repeats, layer levels and tempo. Listen and approve the exact preview before downloading aligned stems. Automatic Ableton import of these previews is disabled in this release.",
    "- Automatic Remix does not generate replacement instruments or recover original effect chains. Source separation, tempo, key and section analysis can be imperfect; review the audio and confirm timing.",
    "- Local-only stems are not silently uploaded for Automatic Remix. Source-use permission and existing reference-plan access are required. Rights attestation is not verified legal clearance.",
    "- BeatMind is a separate product, not an official Ableton or OpenAI product or a ChatGPT plugin. Optional AI listening is distinct from the production chat.",
    "",
    "## Current plans",
    "",
    `- ${TRIAL_TERMS}`,
    ...PLANS.map(plan => `- BeatMind ${plan.name}: ${formatUsd(plan.monthly)}/month or ${formatUsd(plan.yearly)}/year. ${plan.features.join("; ")}.`),
    `- [Current pricing and terms](${BASE_URL}/#pricing): songs, stem separations and AI rounds are separate allowances. Archiving a song does not refund its use.`,
    `- [MixMind](${BASE_URL}/mixmind): the same team's separate DJ-library application. See its page for current plans and supported workflows.`,
    "",
    "## Setup and product guides",
    "",
    `- [Getting started](${BASE_URL}/guide)`,
    `- [Bridge download](${BASE_URL}/download)`,
    `- [Blog](${BASE_URL}/blog)`,
    ...getAllPosts().map(post => `- [${post.title}](${BASE_URL}/blog/${post.slug}): ${post.description} Updated ${post.updated}.`),
    "",
    "## Contact and policies",
    "",
    `- Support: ${SUPPORT_EMAIL}`,
    `- [Privacy](${BASE_URL}/privacy)`,
    `- [Terms](${BASE_URL}/terms)`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
