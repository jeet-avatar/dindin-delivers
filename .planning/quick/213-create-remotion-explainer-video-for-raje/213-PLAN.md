---
phase: quick-213
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/package.json
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/remotion.config.ts
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/tsconfig.json
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/index.ts
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/Root.tsx
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/BrandMonkzVideo.tsx
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/WelcomeScene.tsx
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/LoginScene.tsx
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/ContactsScene.tsx
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/CampaignsScene.tsx
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/ChatbotScene.tsx
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/OutroScene.tsx
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/components/SceneWrapper.tsx
autonomous: true
requirements: [quick-213]

must_haves:
  truths:
    - "Remotion project scaffolded with npm install working cleanly"
    - "6 scenes render: Welcome, Login, Contacts, Campaigns, Chatbot, Outro"
    - "BrandMonkz orange (#FF6B35) and indigo (#4F46E5) colors used consistently"
    - "npm start launches Remotion Studio preview"
    - "npm run render outputs brandmonkz-explainer.mp4 in out/"
  artifacts:
    - path: "/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/package.json"
      provides: "Remotion deps + npm scripts"
    - path: "/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/Root.tsx"
      provides: "Remotion composition registration"
    - path: "/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/BrandMonkzVideo.tsx"
      provides: "Main video sequence joining all 6 scenes"
  key_links:
    - from: "src/Root.tsx"
      to: "src/BrandMonkzVideo.tsx"
      via: "Remotion <Composition> registration"
    - from: "src/BrandMonkzVideo.tsx"
      to: "src/scenes/*.tsx"
      via: "<Series> or <Sequence> composition"
---

<objective>
Create a Remotion explainer video project for Rajesh showing how to use BrandMonkz CRM.

Purpose: Produce a shareable MP4 walkthrough of BrandMonkz — login, contacts import, email campaigns, and AI chatbot — using BrandMonkz brand colors and animated scenes with narration text.
Output: A fully renderable Remotion project at /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/ that produces brandmonkz-explainer.mp4.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Scaffold Remotion project with dependencies and config</name>
  <files>
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/package.json
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/remotion.config.ts
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/tsconfig.json
  </files>
  <action>
    Create the directory /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/ and write the following files:

    **package.json** — use exact versions known to be compatible with Remotion 4.x:
    ```json
    {
      "name": "brandmonkz-video",
      "version": "1.0.0",
      "description": "BrandMonkz CRM explainer video for Rajesh",
      "scripts": {
        "start": "npx remotion studio",
        "render": "npx remotion render BrandMonkzExplainer out/brandmonkz-explainer.mp4 --codec=h264",
        "build": "npm run render"
      },
      "dependencies": {
        "@remotion/cli": "4.0.237",
        "remotion": "4.0.237",
        "react": "18.3.1",
        "react-dom": "18.3.1"
      },
      "devDependencies": {
        "@types/react": "18.3.1",
        "@types/react-dom": "18.3.1",
        "typescript": "5.4.5"
      }
    }
    ```

    **remotion.config.ts**:
    ```ts
    import { Config } from '@remotion/cli/config';
    Config.setVideoImageFormat('jpeg');
    Config.setOverwriteOutput(true);
    ```

    **tsconfig.json**:
    ```json
    {
      "compilerOptions": {
        "target": "ES2020",
        "lib": ["ES2020", "DOM"],
        "jsx": "react",
        "module": "commonjs",
        "moduleResolution": "node",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true
      },
      "include": ["src/**/*", "remotion.config.ts"]
    }
    ```

    Then run `cd /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video && npm install` to install all dependencies.
  </action>
  <verify>
    Run: `ls /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/node_modules/remotion`
    Expected: directory exists (package installed successfully)
  </verify>
  <done>node_modules present, package.json has start and render scripts, tsconfig.json and remotion.config.ts written.</done>
</task>

<task type="auto">
  <name>Task 2: Build all 6 scenes and compose the video</name>
  <files>
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/index.ts
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/Root.tsx
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/BrandMonkzVideo.tsx
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/components/SceneWrapper.tsx
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/WelcomeScene.tsx
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/LoginScene.tsx
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/ContactsScene.tsx
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/CampaignsScene.tsx
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/ChatbotScene.tsx
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/OutroScene.tsx
  </files>
  <action>
    Brand constants:
    - ORANGE = '#FF6B35'
    - INDIGO = '#4F46E5'
    - BG_DARK = '#1E1B4B' (deep indigo for backgrounds)
    - WHITE = '#FFFFFF'
    - FPS = 30
    - Each scene = 5 seconds = 150 frames

    Total composition: 6 scenes x 150 frames = 900 frames (30 seconds at 30fps)
    Resolution: 1280x720 (16:9, easy MP4 output)

    **src/index.ts** — Remotion entry point:
    ```ts
    import { registerRoot } from 'remotion';
    import { Root } from './Root';
    registerRoot(Root);
    ```

    **src/Root.tsx** — registers the composition:
    ```tsx
    import { Composition } from 'remotion';
    import { BrandMonkzVideo } from './BrandMonkzVideo';

    export const Root: React.FC = () => (
      <Composition
        id="BrandMonkzExplainer"
        component={BrandMonkzVideo}
        durationInFrames={900}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{}}
      />
    );
    ```

    **src/components/SceneWrapper.tsx** — shared scene layout with fade-in animation:
    - Full-width/height div with indigo background (#1E1B4B)
    - Uses `useCurrentFrame()` and `interpolate()` for fade-in over first 15 frames
    - Accepts: `icon` (string emoji), `title` (string), `subtitle` (string), `children` (ReactNode optional)
    - Layout: centered column, icon at top (72px), title below in orange (#FF6B35) bold 52px, subtitle in white 28px, children below
    - Add a bottom accent bar (8px tall, full width, orange #FF6B35)
    - Add BrandMonkz wordmark top-left: "Brand" in white + "Monkz" in orange, 18px bold

    **src/BrandMonkzVideo.tsx** — sequences all 6 scenes using Remotion `<Series>`:
    ```tsx
    import { Series } from 'remotion';
    import { WelcomeScene } from './scenes/WelcomeScene';
    import { LoginScene } from './scenes/LoginScene';
    import { ContactsScene } from './scenes/ContactsScene';
    import { CampaignsScene } from './scenes/CampaignsScene';
    import { ChatbotScene } from './scenes/ChatbotScene';
    import { OutroScene } from './scenes/OutroScene';

    export const BrandMonkzVideo: React.FC = () => (
      <Series>
        <Series.Sequence durationInFrames={150}><WelcomeScene /></Series.Sequence>
        <Series.Sequence durationInFrames={150}><LoginScene /></Series.Sequence>
        <Series.Sequence durationInFrames={150}><ContactsScene /></Series.Sequence>
        <Series.Sequence durationInFrames={150}><CampaignsScene /></Series.Sequence>
        <Series.Sequence durationInFrames={150}><ChatbotScene /></Series.Sequence>
        <Series.Sequence durationInFrames={150}><OutroScene /></Series.Sequence>
      </Series>
    );
    ```

    **Scene implementations** — each wraps `<SceneWrapper>` with scene-specific content:

    1. **WelcomeScene.tsx**
       - icon: "👋"
       - title: "Welcome to BrandMonkz"
       - subtitle: "Your AI-powered CRM for smart outreach"
       - Extra: animated tagline sliding up from bottom after 30 frames — "Grow your business with intelligent automation"
       - Use `spring()` from remotion for the slide-up (delay=30, damping=200)

    2. **LoginScene.tsx**
       - icon: "🔐"
       - title: "Step 1: Login"
       - subtitle: "Visit app.brandmonkz.com and sign in"
       - Extra: a mock login card below subtitle — white rounded box (padding 20px, border-radius 12px), containing: "Email" label + grey input bar, "Password" label + grey input bar, an orange "Login" button. Card appears via spring() after 20 frames. Width 360px, centered.

    3. **ContactsScene.tsx**
       - icon: "👥"
       - title: "Step 2: Import Contacts"
       - subtitle: "Upload your CSV or add contacts manually"
       - Extra: three animated contact "cards" that appear one-by-one (at frames 30, 60, 90 using spring()). Each card: white pill shape, 280px wide, contains a circle avatar (indigo bg, white initials) + name + email in small text.
       - Sample contacts: "Rajesh Kumar / rajesh@example.com", "Priya Patel / priya@example.com", "Amit Shah / amit@example.com"

    4. **CampaignsScene.tsx**
       - icon: "📧"
       - title: "Step 3: Send Email Campaigns"
       - subtitle: "Create targeted campaigns in minutes"
       - Extra: a mock email preview card (white, rounded, 420px wide) showing:
         - Orange "New Campaign" badge top-right
         - "Subject: Exclusive offer just for you!"
         - Body preview: "Hi Rajesh, we have something special..."
         - Row of stats: "📬 1,240 sent  ✅ 62% opened  🖱 28% clicked"
       - Card slides in via spring() at frame 25

    5. **ChatbotScene.tsx**
       - icon: "🤖"
       - title: "Step 4: AI Chatbot"
       - subtitle: "Your AI assistant answers questions 24/7"
       - Extra: a mock chat interface (white rounded card, 380px wide):
         - Message bubble (indigo bg, white text, right-aligned): "How many contacts do I have?"
         - AI response bubble (light grey bg, dark text, left-aligned): "You have 1,240 contacts. 340 opened your last campaign. 🎉"
         - Small "BrandMonkz AI" label above the response bubble in orange
       - User message appears at frame 20, AI response at frame 55 (both via spring())

    6. **OutroScene.tsx**
       - icon: "🚀"
       - title: "Ready to grow?"
       - subtitle: "Start your free trial at brandmonkz.com"
       - Extra: three feature pill badges arranged in a row below (appear via spring() staggered at 30/50/70):
         - [🤖 AI-Powered] [📧 Email Campaigns] [📊 Smart Analytics]
         - Each pill: white bg, indigo text, 14px, rounded-full, padding 8px 16px
       - CTA line at bottom: "Questions? Contact support@brandmonkz.com" in orange 16px

    Animation pattern for all scenes:
    - Use `useCurrentFrame()` + `interpolate()` for opacity fade-in (frames 0-15, opacity 0→1)
    - Use `spring({ frame, fps: 30, config: { damping: 200 } })` for scale/translate animations
    - All springs should use `frame - delayFrames` pattern with Math.max(0, ...) to delay start
  </action>
  <verify>
    Run: `cd /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video && npx remotion render BrandMonkzExplainer out/brandmonkz-explainer.mp4 --codec=h264 2>&1 | tail -5`
    Expected: "Your video is ready" or progress reaching 100% with output file created
    Also verify: `ls -lh out/brandmonkz-explainer.mp4`
  </verify>
  <done>
    - All 6 scene files written with correct animations and brand colors
    - BrandMonkzVideo.tsx sequences them with Series
    - Root.tsx registers the 900-frame 30fps 1280x720 composition
    - `npm run render` produces out/brandmonkz-explainer.mp4
    - `npm start` launches Remotion Studio for preview
  </done>
</task>

</tasks>

<verification>
After Task 2 completes:
1. `ls -lh /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/out/brandmonkz-explainer.mp4` — file exists with non-zero size
2. `npx remotion compositions` from project dir lists "BrandMonkzExplainer" with 900 frames
3. Open out/brandmonkz-explainer.mp4 in QuickTime to visually confirm 6 scenes render with orange+indigo brand colors
</verification>

<success_criteria>
- Remotion project installs cleanly with npm install
- 6 animated scenes present: Welcome, Login, Contacts, Campaigns, Chatbot, Outro
- BrandMonkz orange (#FF6B35) and indigo (#4F46E5) colors used throughout
- npm start launches Remotion Studio preview at localhost:3000
- npm run render produces out/brandmonkz-explainer.mp4 (~30 seconds, 900 frames at 30fps)
- MP4 is playable and contains all 6 scenes
</success_criteria>

<output>
After completion, create `.planning/quick/213-create-remotion-explainer-video-for-raje/213-SUMMARY.md` with:
- What was built
- File paths created
- Render command and output location
- How Rajesh can preview and re-render
</output>
