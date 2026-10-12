// Run after applying the migration and deploying the two follow-up functions.
// Uses the existing Supabase CLI login. The generated cron secret stays in
// process memory and is passed through stdin, never files or command arguments.
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const cli = process.argv[2] || "supabase";
const projectRef = "vriofvpoagfnlmrbepkm";
const secret = randomBytes(32).toString("hex");
const run = (args, input) => {
  const result = spawnSync(cli, args, { input, encoding: "utf8", timeout: 180_000 });
  if (result.error || result.status !== 0) {
    // CLI errors might echo an input statement; redact the generated secret.
    console.error((result.stderr || result.stdout || result.error?.message || "Supabase command failed").replaceAll(secret, "[redacted]"));
    process.exit(1);
  }
  return result.stdout;
};

run(["secrets", "set", "--project-ref", projectRef, "--env-file", "/dev/stdin"],
  `DEMO_FOLLOWUP_CRON_SECRET=${secret}\n`);
console.log("Private follow-up worker secret configured.");

run(["db", "query", "--linked", "--file", "/dev/stdin"], `
  create extension if not exists pg_cron;
  create extension if not exists pg_net with schema extensions;
  do $vault$
  declare secret_id uuid;
  begin
    select id into secret_id from vault.secrets where name = 'sadha_demo_followup_cron_secret';
    if secret_id is null then
      perform vault.create_secret('${secret}', 'sadha_demo_followup_cron_secret', 'Private Sadha demo follow-up cron authentication');
    else
      perform vault.update_secret(secret_id, '${secret}', 'sadha_demo_followup_cron_secret', 'Private Sadha demo follow-up cron authentication');
    end if;
  end;
  $vault$;
  select cron.schedule('sadha-demo-lead-followups', '*/5 * * * *', $cron$
    select net.http_post(
      url := 'https://${projectRef}.supabase.co/functions/v1/send-demo-followups',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sadha_demo_followup_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $cron$);
`);
console.log("Follow-up cron activated: every five minutes, new leads only, one-hour delay.");
