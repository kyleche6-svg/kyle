import "dotenv/config";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const email = process.argv[2];
const { rows } = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
if (rows.length === 0) {
  console.error("No such user:", email);
  process.exit(1);
}
const userId = rows[0].id;

await client.query(
  `INSERT INTO "Subscription" (id, "userId", status, "updatedAt")
   VALUES (gen_random_uuid()::text, $1, 'active', now())
   ON CONFLICT ("userId") DO UPDATE SET status = 'active', "updatedAt" = now()`,
  [userId],
);

console.log("Activated subscription for", email);
await client.end();
