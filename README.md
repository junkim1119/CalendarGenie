# Combined Calendar

Merge your Canvas, Google, and Outlook calendars into one view, type events in plain English, and download everything as an `.ics` file.

Colors: **blue** = social, **green** = class, **orange** = other.

## Setup (one time)

1. Install Node.js 20 or newer from https://nodejs.org (the "LTS" installer).
2. In this folder, run:
   ```bash
   npm install
   ```
3. Copy `.env.local.example` to `.env.local` and paste your Anthropic API key (from https://console.anthropic.com) after `ANTHROPIC_API_KEY=`.

## Run

```bash
npm run dev
```

Then open http://localhost:3000.

## Using it

- **Synced calendars**: pick the source, paste its private feed link (instructions appear under the box), and click *Add calendar*. Canvas events default to green. Google and Outlook events are colored by keywords, and you can click any event to change its color.
- **Type your events**: write events in plain English, click *Create events*, check the preview, then *Add to calendar*.
- **Download**: choose categories and click *Download .ics*, then import the file into Google (Settings → Import & export) or Outlook (Add calendar → Upload from file).

Your feed links and typed events are saved in `data/store.json` on your computer. Feed links are private, so don't share that file.
