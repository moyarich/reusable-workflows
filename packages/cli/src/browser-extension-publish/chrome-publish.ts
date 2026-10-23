/** Chrome Web Store API orchestration, independent of Commander parsing. */
import { readFileSync } from "node:fs";
import process from "node:process";

async function jsonRequest(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.text();
  if (!response.ok)
    throw new Error(
      "Store HTTP " + response.status + ": " + payload.slice(0, 1000),
    );
  return payload ? JSON.parse(payload) : {};
}
export async function chromePublish(
  archive: string,
  options: { publisher: string; extension: string },
) {
  const client = process.env.CHROME_CLIENT_ID || "";
  const secret = process.env.CHROME_CLIENT_SECRET || "";
  const refresh = process.env.CHROME_REFRESH_TOKEN || "";
  if (
    ![client, secret, refresh, options.publisher, options.extension].every(
      Boolean,
    )
  )
    throw new Error(
      "Chrome OAuth credentials, publisher ID, and extension ID required",
    );
  const tokenResponse = await jsonRequest(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: client,
        client_secret: secret,
        refresh_token: refresh,
        grant_type: "refresh_token",
      }),
    },
  );
  const token = tokenResponse.access_token;
  if (!token) throw new Error("Missing Chrome access token");
  const base = "https://chromewebstore.googleapis.com";
  const item =
    "/v2/publishers/" +
    encodeURIComponent(options.publisher) +
    "/items/" +
    encodeURIComponent(options.extension);
  const headers = { Authorization: "Bearer " + token };
  let result = await jsonRequest(base + "/upload" + item + ":upload", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/zip" },
    body: readFileSync(archive),
  });
  let state = result.uploadState;
  for (let attempt = 0; state === "IN_PROGRESS" && attempt < 30; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    result = await jsonRequest(base + item + ":fetchStatus", { headers });
    state = result.lastAsyncUploadState ?? result.uploadState;
  }
  if (state !== "SUCCEEDED")
    throw new Error("Chrome Web Store upload failed: " + state);
  await jsonRequest(base + item + ":publish", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" }),
  });
}
