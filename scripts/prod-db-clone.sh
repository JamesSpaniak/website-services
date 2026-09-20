#!/usr/bin/env bash
# Clone the production Aurora database into a local Postgres for migration
# rehearsal — read-only against prod, PII scrubbed in flight, nothing created
# in AWS (one ephemeral Fargate task using the *current* prod task definition).
#
#   ./scripts/prod-db-clone.sh dump      # run the dump task, pull it from CloudWatch → $OUT/tables/*.json
#   ./scripts/prod-db-clone.sh restore   # local Postgres @ $PGPORT: prod schema → prod data → pending migrations → nightly job
#   ./scripts/prod-db-clone.sh all
#
# How it works: RDS is private (no bastion, no ECS Exec), but the API task can
# reach it. We `ecs run-task` the prod image with a `node -e` override that
# SELECTs every public table, scrubs it, and prints base64 JSON chunks to
# stdout; the awslogs driver lands them in the API log group, which we read
# back with `logs get-log-events`. Restore replays prod's applied migrations,
# loads the rows, then runs whatever is pending in this checkout — exactly what
# `migrationsRun: true` will do on the next deploy — and finishes with the
# analytics maintenance job so reconciliation can be inspected.
#
# Scrubbing (see the JS below): password/token/secret/otp columns → NULL or
# 'scrubbed', email-ish text → md5 hash @example.test, users.first/last_name →
# NULL, users.username → user<id>, ip/user_agent → NULL, audit details minus
# email/username/ip. Do NOT relax this: the dump transits CloudWatch (L1).
#
# Runbook: workflows/tech/prod-db-clone.md
set -euo pipefail

CLUSTER="${CLUSTER:-droneedge-dev-cluster}"
SERVICE="${SERVICE:-droneedge-dev-api-server-service}"
CONTAINER="${CONTAINER:-api-server}"
LOG_GROUP="${LOG_GROUP:-/ecs/droneedge-dev/api-server}"
OUT="${OUT:-/tmp/proddump}"
PGPORT="${PGPORT:-55432}"
PGCONTAINER="${PGCONTAINER:-de-prodlike}"
PGIMAGE="${PGIMAGE:-postgres:17}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

read -r -d '' DUMP_JS <<'JS' || true
const { Client } = require('pg');
const out = (s) => process.stdout.write(s + '\n');
const SKIP = /^(logs|frontend_logs|typeorm_metadata)$/;
(async () => {
  const c = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  await c.connect();
  const ver = await c.query('SHOW server_version');
  const tables = (await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1")).rows.map((r) => r.tablename).filter((t) => !SKIP.test(t));
  out('DUMP_BEGIN ' + JSON.stringify({ version: ver.rows[0].server_version, tables }));
  for (const t of tables) {
    const cols = (await c.query("SELECT column_name AS n, data_type AS ty, (is_nullable='YES') AS nul FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [t])).rows;
    const sel = cols.map((col) => {
      const n = col.n, q = '"' + n + '"', textual = /char|text/.test(col.ty), numeric = /int|numeric|serial/.test(col.ty);
      if (/password|token|secret|otp/i.test(n)) return (numeric ? '0' : col.nul ? 'NULL' : "'scrubbed'") + ' AS ' + q;
      if (textual && /email/i.test(n)) return 'CASE WHEN ' + q + " IS NULL THEN NULL ELSE 'e'||md5(" + q + ")||'@example.test' END AS " + q;
      if (t === 'users' && /^(first_name|last_name|phone)$/.test(n)) return 'NULL AS ' + q;
      if (t === 'users' && n === 'username') return "'user'||id AS " + q;
      if (textual && /^(ip_address|ip|user_agent)$/.test(n)) return 'NULL AS ' + q;
      if (n === 'details' && col.ty === 'jsonb') return '(' + q + " - 'email' - 'username' - 'ip' - 'userAgent') AS " + q;
      return q;
    }).join(',');
    const n = (await c.query('SELECT count(*)::int AS n FROM "' + t + '"')).rows[0].n;
    out('TABLE ' + t + ' ' + n);
    const lim = 200;
    for (let off = 0; ; off += lim) {
      const r = await c.query('SELECT row_to_json(x)::text AS j FROM (SELECT ' + sel + ' FROM "' + t + '" ORDER BY 1 LIMIT ' + lim + ' OFFSET ' + off + ') x');
      if (!r.rows.length) break;
      let buf = [], size = 0;
      const emit = () => { if (buf.length) out('ROWS ' + t + ' ' + Buffer.from('[' + buf.join(',') + ']').toString('base64')); buf = []; size = 0; };
      for (const { j } of r.rows) { buf.push(j); size += j.length; if (size > 40000) emit(); }
      emit();
      if (r.rows.length < lim) break;
    }
  }
  const seq = await c.query("SELECT sequencename AS s, last_value AS v FROM pg_sequences WHERE schemaname='public'");
  out('SEQ ' + JSON.stringify(seq.rows));
  out('DUMP_END');
  await c.end();
})().catch((e) => { console.error('DUMP_ERROR ' + e.message); process.exit(1); });
JS

dump() {
  mkdir -p "$OUT/tables"
  echo "▶ resolving service network + task definition"
  local svc td subnets sgs
  svc=$(aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" --output json)
  td=$(echo "$svc" | node -e 'const s=JSON.parse(require("fs").readFileSync(0)).services[0];console.log(s.taskDefinition)')
  subnets=$(echo "$svc" | node -e 'const s=JSON.parse(require("fs").readFileSync(0)).services[0];console.log(JSON.stringify(s.networkConfiguration.awsvpcConfiguration.subnets))')
  sgs=$(echo "$svc" | node -e 'const s=JSON.parse(require("fs").readFileSync(0)).services[0];console.log(JSON.stringify(s.networkConfiguration.awsvpcConfiguration.securityGroups))')
  echo "   task definition: $td"

  DUMP_JS="$DUMP_JS" TD="$td" SUBNETS="$subnets" SGS="$sgs" CLUSTER="$CLUSTER" CONTAINER="$CONTAINER" node -e '
    const e=process.env;
    const input={cluster:e.CLUSTER,taskDefinition:e.TD,launchType:"FARGATE",count:1,startedBy:"prod-db-clone",
      networkConfiguration:{awsvpcConfiguration:{subnets:JSON.parse(e.SUBNETS),securityGroups:JSON.parse(e.SGS),assignPublicIp:"DISABLED"}},
      overrides:{containerOverrides:[{name:e.CONTAINER,command:["node","-e",e.DUMP_JS]}]}};
    require("fs").writeFileSync(process.argv[1],JSON.stringify(input));' "$OUT/run-task.json"

  echo "▶ launching read-only dump task"
  local task
  task=$(aws ecs run-task --cli-input-json "file://$OUT/run-task.json" --query 'tasks[0].taskArn' --output text)
  [[ "$task" == arn:* ]] || { echo "run-task failed: $task"; exit 1; }
  local id="${task##*/}"
  echo "   task $id"
  for _ in $(seq 1 60); do
    local st
    st=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$id" --query 'tasks[0].[lastStatus,containers[0].exitCode]' --output text)
    echo "   $st"
    [[ "$st" == STOPPED* ]] && break
    sleep 6
  done
  local exit_code
  exit_code=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$id" --query 'tasks[0].containers[0].exitCode' --output text)
  [[ "$exit_code" == "0" ]] || { echo "dump task exited $exit_code — check $LOG_GROUP"; exit 1; }

  echo "▶ pulling log stream"
  sleep 5
  STREAM="$CONTAINER/$CONTAINER/$id" LOG_GROUP="$LOG_GROUP" OUT="$OUT" node -e '
    const {execFileSync}=require("child_process"); const fs=require("fs"); const e=process.env;
    let token=null; const lines=[];
    for(let i=0;i<500;i++){
      const args=["logs","get-log-events","--log-group-name",e.LOG_GROUP,"--log-stream-name",e.STREAM,"--start-from-head","--output","json"];
      if(token) args.push("--next-token",token);
      const o=JSON.parse(execFileSync("aws",args,{maxBuffer:1<<28}).toString());
      for(const ev of o.events) lines.push(ev.message);
      if(!o.events.length||!o.nextForwardToken||o.nextForwardToken===token) break;
      token=o.nextForwardToken;
    }
    fs.writeFileSync(e.OUT+"/raw.txt",lines.join("\n")+"\n");
    if(!lines.some(l=>l.startsWith("DUMP_END"))) { console.error("incomplete dump (no DUMP_END) — rerun the pull in a minute"); process.exit(1); }
    const tables={}; let seq=[];
    for(const l of lines){
      if(l.startsWith("ROWS ")){const [,t,b64]=l.split(" ");(tables[t]??=[]).push(...JSON.parse(Buffer.from(b64,"base64").toString()));}
      else if(l.startsWith("SEQ ")) seq=JSON.parse(l.slice(4));
      else if(l.startsWith("DUMP_BEGIN ")) console.log("   prod", l.slice(11,80));
    }
    fs.rmSync(e.OUT+"/tables",{recursive:true,force:true}); fs.mkdirSync(e.OUT+"/tables",{recursive:true});
    for(const [t,rows] of Object.entries(tables)) fs.writeFileSync(e.OUT+"/tables/"+t+".json",JSON.stringify(rows));
    fs.writeFileSync(e.OUT+"/seq.json",JSON.stringify(seq));
    console.log("   "+Object.entries(tables).map(([t,r])=>t+"="+r.length).join(" "));'
  echo "✔ dump in $OUT/tables (scrubbed). Delete when done: rm -rf $OUT"
}

restore() {
  [[ -d "$OUT/tables" ]] || { echo "no dump at $OUT/tables — run: $0 dump"; exit 1; }
  echo "▶ local Postgres $PGIMAGE on :$PGPORT (container $PGCONTAINER)"
  docker rm -f "$PGCONTAINER" >/dev/null 2>&1 || true
  docker run -d --rm --name "$PGCONTAINER" -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=blog -p "$PGPORT:5432" "$PGIMAGE" >/dev/null
  for _ in $(seq 1 30); do docker exec "$PGCONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
  cd "$ROOT/backend"
  OUT="$OUT" PGPORT="$PGPORT" NODE_PATH="$PWD/node_modules" \
    npx ts-node --transpile-only -r tsconfig-paths/register -P tsconfig.json "$ROOT/scripts/prod-db-clone-restore.ts"
  echo "✔ prod-like DB ready: postgres://postgres:postgres@localhost:$PGPORT/blog   (stop: docker rm -f $PGCONTAINER)"
}

case "${1:-}" in
  dump) dump ;;
  restore) restore ;;
  all) dump; restore ;;
  *) echo "usage: $0 dump|restore|all"; exit 1 ;;
esac
