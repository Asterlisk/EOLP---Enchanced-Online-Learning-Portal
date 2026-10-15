const https = require("https");

function postEmail(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload));
    const request = https.request(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": body.length,
        },
      },
      (response) => {
        let responseBody = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => { responseBody += chunk; });
        response.on("end", () => {
          let result;
          try {
            result = responseBody ? JSON.parse(responseBody) : {};
          } catch {
            return reject(new Error("Resend returned an unreadable response."));
          }
          if (response.statusCode < 200 || response.statusCode >= 300) {
            return reject(new Error(result.message || result.name || `Resend request failed (${response.statusCode}).`));
          }
          resolve(result);
        });
      }
    );
    request.setTimeout(15_000, () => request.destroy(new Error("Resend request timed out.")));
    request.on("error", reject);
    request.end(body);
  });
}

async function sendLoginCode({ to, code }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) throw new Error("Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM.");

  await postEmail({
    from,
    to: [to],
    subject: "Your EOLP sign-in code",
    text: `Your EOLP sign-in code is ${code}. It expires in 10 minutes. If you did not try to sign in, you can ignore this email.`,
  }, apiKey);
}

module.exports = { sendLoginCode };

