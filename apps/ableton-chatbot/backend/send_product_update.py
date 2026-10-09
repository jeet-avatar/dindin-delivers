"""Send a product-update email campaign once per user. Runs where the production database is (an ECS task).

Example:
  python send_product_update.py --campaign bridge-1.2.0 --only you@example.com
  python send_product_update.py --campaign bridge-1.2.0 --dry-run
"""

import argparse

import product_updates

CAMPAIGNS = {
    "bridge-1.2.0": dict(
        subject="BeatMind Bridge 1.2: stay signed in, detailed stems and updates in the app",
        headline="A new BeatMind Bridge is ready",
        lines=["The Bridge now stays signed in, even while BeatMind updates. No more logging in again.",
               "Separate reference tracks on your own Mac into 8 detailed stems (drums plus kick, snare, toms and "
               "cymbals, bass, vocals and other) and place them straight into Ableton.",
               "Future Bridge updates install from the Bridge window with one click, when it suits you."],
        cta_label="Download BeatMind Bridge 1.2", cta_url="https://www.beatmind.io/BeatMind-Bridge.dmg"),
    "mixmind-1.2.1": dict(
        subject="MixMind 1.2.1: faster AI and improved reliability",
        headline="MixMind 1.2.1 is ready",
        lines=["AI responses are faster and more reliable — no more chat timeouts while building a set.",
               "Download and install when it suits you. Your library, playlists and settings are not affected.",
               "Sign in to your BeatMind dashboard and go to Downloads to get the latest version."],
        cta_label="Download MixMind 1.2.1", cta_url="https://www.beatmind.io/dashboard"),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--campaign", required=True, choices=sorted(CAMPAIGNS))
    parser.add_argument("--only", help="send only to this address (test send)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    sent, errors, planned = product_updates.send_campaign(args.campaign, only_email=args.only, dry_run=args.dry_run,
                                                          **CAMPAIGNS[args.campaign])
    print(f"campaign={args.campaign} planned={len(planned)} sent={sent} errors={len(errors)} dry_run={args.dry_run}")
    for address, error in errors:
        print("  not sent:", address, error)


if __name__ == "__main__":
    main()
