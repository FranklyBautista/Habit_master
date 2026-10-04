import { expect } from "@playwright/test";

// Local Supabase captures every auth email in Mailpit (supabase/config.toml
// `[local_smtp]`), which CI also runs; its HTTP API exposes the inbox.
const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitSearch = {
  messages: { Snippet: string; Created: string }[];
};

// Returns the code from the newest email sent to `email`, waiting for it to
// arrive. The code is the only six-digit number in the templates.
export async function readEmailedCode(email: string): Promise<string> {
  let code: string | undefined;
  await expect(async () => {
    const response = await fetch(
      `${mailpitUrl}/api/v1/search?${new URLSearchParams({ query: `to:"${email}"` })}`,
    );
    const { messages } = (await response.json()) as MailpitSearch;
    code = messages[0]?.Snippet.match(/\b(\d{6})\b/)?.[1];
    expect(code).toBeDefined();
  }).toPass({ timeout: 15_000 });
  return code!;
}
