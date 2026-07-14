// netlify/functions/scan.js
//
// This function runs on Netlify's servers, not in the user's browser.
// It reads your Anthropic API key from an environment variable you set
// in the Netlify dashboard (Site settings -> Environment variables ->
// ANTHROPIC_API_KEY). The key is never sent to, or visible from, the
// person using the app.
//
// The app's front end calls this function at /.netlify/functions/scan
// with a photo and the family's allergy info, and gets back a plain
// JSON result: what the food is, an estimated calorie count, and a
// per-person allergy check.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        error:
          "Scanning isn't set up yet. Add your Anthropic API key to this site's Environment variables in Netlify as ANTHROPIC_API_KEY, then redeploy.",
      }),
