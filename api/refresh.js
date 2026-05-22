/**
 * Vercel Cron API Route: /api/refresh
 * Schedule: 0 6 * * * (daily at 6 AM UTC)
 *
 * This endpoint is called by Vercel Cron daily.
 * It triggers a GitHub Actions workflow dispatch which:
 *   1. Runs the YouTube pipeline (fetch videos + transcripts)
 *   2. Commits updated data back to the repo
 *   3. Vercel auto-deploys on push
 *
 * Auth: CRON_SECRET env var must match the request Authorization header
 */

export default async function handler(req, res) {
  // Verify this is called by Vercel Cron (not a random request)
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error('Missing GitHub env vars');
    return res.status(500).json({
      error: 'Missing GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO env vars',
      hint: 'Set these in Vercel Project Settings > Environment Variables'
    });
  }

  try {
    // Trigger GitHub Actions workflow dispatch
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/daily-pipeline.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API ${response.status}: ${body}`);
    }

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Pipeline refresh triggered via GitHub Actions`);

    return res.status(200).json({
      success: true,
      message: 'Pipeline refresh triggered',
      timestamp,
      workflow: `${GITHUB_OWNER}/${GITHUB_REPO}:daily-pipeline.yml`,
    });
  } catch (err) {
    console.error('Refresh trigger failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
