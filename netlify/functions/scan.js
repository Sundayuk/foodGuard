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
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request." }) };
  }

  const { image, mediaType, family, mode } = payload;
  if (!image) {
    return { statusCode: 400, body: JSON.stringify({ error: "No image was sent." }) };
  }

  const familyParts = (family || [])
    .map((m) => {
      const allergies = (m.allergies || []).join(", ") || "none";
      const hidden = (m.hiddenTerms || []).join(", ") || "none";
      return `${m.name} allergies: ${allergies}. Also flag if any of these hidden forms appear: ${hidden}.`;
    })
    .join(" | ");

  const isCalorieMode = mode === "cal";
  const prompt = `Look at this photo of food${
    isCalorieMode ? " on a plate" : " or a food label"
  }. Do two things: 1) Identify the food and estimate calories for a typical portion shown. 2) If an ingredients list is visible, check it for each family member below: ${
    familyParts || "no family members provided"
  }. Check for obvious allergen names AND the listed hidden ingredient names. If you find a hidden ingredient, flag it and clearly explain which allergen it comes from — for example say "whey powder is a milk derivative" or "arachis oil is peanut oil". This explanation is very important for user safety. Reply ONLY in valid JSON, no markdown, no code fences: {"foodDescription":"what the food is","estimatedCalories":number,"calorieNote":"brief portion note","ingredientsFound":true or false,"results":[{"name":"person name","flagged":true or false,"message":"clear safety message explaining why flagged or why safe","matchedTerms":["exact ingredient found and which allergen it belongs to"]}]}. Always provide estimatedCalories even if no ingredients label is visible — estimate from the visual portion.`;

  const body = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: image } },
          { type: "text", text: prompt },
        ],
      },
    ],
  };

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (data.error) {
      return { statusCode: 200, body: JSON.stringify({ error: "API error: " + (data.error.message || "unknown") }) };
    }

    let text = "";
    for (const block of data.content || []) {
      if (block.type === "text") {
        text = block.text;
        break;
      }
    }
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // The model sometimes adds a stray word or sentence around the JSON.
      // Try to pull out just the { ... } block and parse that instead of
      // giving up right away.
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        try {
          parsed = JSON.parse(text.slice(start, end + 1));
        } catch (e2) {
          return {
            statusCode: 200,
            body: JSON.stringify({
              error: "Could not read the result. Please try again.",
              debugRaw: text.slice(0, 300),
            }),
          };
        }
      } else {
        return {
          statusCode: 200,
          body: JSON.stringify({
            error: "Could not read the result. Please try again.",
            debugRaw: text.slice(0, 300),
          }),
        };
      }
    }

    return { statusCode: 200, body: JSON.stringify({ result: parsed }) };
  } catch (err) {
    return {
      statusCode: 200,
      body: JSON.stringify({ error: "Could not reach the scanning service. Please try again in a moment." }),
    };
  }
};
