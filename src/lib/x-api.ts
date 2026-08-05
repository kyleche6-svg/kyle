// Real X API client. Gated on X_BEARER_TOKEN — the free tier was discontinued
// (Feb 2026 policy change), so this is pay-per-use. Posts fetched here are
// meant to be ingested into the Post table by scripts/sync-tweets.mjs, run on
// a conservative interval (e.g. hourly via cron), not called per page request.

export type RemotePost = {
  id: string;
  text: string;
  createdAt: string;
};

export async function fetchRecentPosts(
  xHandle: string,
  sinceId?: string,
): Promise<RemotePost[]> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    throw new Error("X_BEARER_TOKEN is not configured");
  }

  const userRes = await fetch(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(xHandle)}`,
    { headers: { Authorization: `Bearer ${bearerToken}` } },
  );
  if (!userRes.ok) {
    throw new Error(`Failed to resolve X user @${xHandle}: ${userRes.status}`);
  }
  const userData = await userRes.json();
  const userId = userData.data?.id;
  if (!userId) {
    throw new Error(`No X user id found for @${xHandle}`);
  }

  const params = new URLSearchParams({
    max_results: "10",
    "tweet.fields": "created_at",
  });
  if (sinceId) params.set("since_id", sinceId);

  const tweetsRes = await fetch(
    `https://api.x.com/2/users/${userId}/tweets?${params.toString()}`,
    { headers: { Authorization: `Bearer ${bearerToken}` } },
  );
  if (!tweetsRes.ok) {
    throw new Error(`Failed to fetch posts for @${xHandle}: ${tweetsRes.status}`);
  }
  const tweetsData = await tweetsRes.json();

  return (tweetsData.data ?? []).map((tweet: { id: string; text: string; created_at: string }) => ({
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.created_at,
  }));
}
