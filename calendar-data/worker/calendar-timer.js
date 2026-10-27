// Cloudflare Worker "nemo-calendar-timer".
// GitHub's own schedule for the "Update calendar" Action often runs hours
// late, so this Worker starts that Action every 10 minutes instead.
// Cloudflare: Workers & Pages -> nemo-calendar-timer.
//   Schedule:  Settings -> Trigger events (cron "*/10 * * * *")
//   Secret:    Settings -> Variables and Secrets -> GITHUB_TOKEN
//              (fine-grained GitHub token, this repo only, Actions: Read and write)
const WORKFLOW_URL =
  "https://api.github.com/repos/nemoemt/nemoemt.github.io/actions/workflows/update-calendar.yml/dispatches";

export default {
  async scheduled(event, env, ctx) {
    if (!env.GITHUB_TOKEN) {
      console.log("GITHUB_TOKEN secret is not set; nothing to do.");
      return;
    }
    const res = await fetch(WORKFLOW_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.GITHUB_TOKEN,
        "Accept": "application/vnd.github+json",
        "User-Agent": "nemo-calendar-timer",
      },
      body: JSON.stringify({ ref: "main" }),
    });
    // 204 = started. 401 = token wrong or expired. 403/404 = token missing the Actions permission.
    console.log("GitHub responded " + res.status);
  },

  async fetch() {
    return new Response("NEMO calendar timer. Nothing to see here.", { status: 404 });
  },
};
