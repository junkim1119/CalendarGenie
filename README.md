# CalendarGenie

Type your events in plain English (or fill in a quick form), see them on a color-coded calendar, and download them as `.ics` calendar invites for Outlook, Google Calendar, or Apple Calendar. No AI and no API keys.

Colors: **blue** = social, **green** = class, **orange** = other.

## Run it on your Mac

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Events are saved to `data/store.json`.

## Using it

- **Add events**: type one event per line (for example `Chicken Beer Night Oct 1 6-8pm` or `CS101 lecture every Tue/Thu 2-3:15pm until Dec 12 in Hall B`) and click *Read text*. Or click *+ Blank event* to fill in the form yourself. Check the details, then click *Save*.
- **Download one invite**: click an event on the calendar, then *Download invite (.ics)*. Open the file to add it to your calendar, or attach it to an email to invite others.
- **Download everything**: use *Download all events*, optionally filtered by color.

## Deploying to Vercel

1. On https://vercel.com, click **Add New → Project**, import the `CalendarGenie` GitHub repo, and click **Deploy**.
2. In the project, open **Storage → Create Database → Upstash (Redis)**, create a free database, and connect it to the project. This is where events are saved.
3. In **Settings → Environment Variables**, add `APP_PASSWORD1`: a password you make up for logging in.
4. Open **Deployments**, click **⋯** on the latest one, and choose **Redeploy** so the new settings take effect.

After that, every push to `main` deploys automatically.
