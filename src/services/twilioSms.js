import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.warn(
    "[Twilio] Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER env vars. SMS sending will be skipped."
  );
}

let client = null;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

export async function sendSms(to, body) {
  if (!client || !fromNumber) {
    console.warn("[Twilio] Client not configured. Skipping SMS send.");
    return;
  }

  try {
    const msg = await client.messages.create({
      body,
      from: fromNumber,
      to,
    });
    console.log(`[Twilio] SMS sent. SID=${msg.sid}`);
  } catch (e) {
    console.error("[Twilio] Failed to send SMS:", e.message);
  }
}
