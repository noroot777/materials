#!/usr/bin/env node
// 把 demo-data.mjs 里的虚构数据灌进一套**临时的** ash 实例，供 capture-shots.mjs 截图。
//
// 用法（在本工程目录下；ASH_REPO 是一份装过依赖、build 过的 ash 检出。实例必须是全新的数据目录，
// 且先启动、后灌数据——带 ASH_PREVIEW 启动时会把运行态洗掉）：
//   export ASH_REPO=<ash 检出目录>; H=/tmp/ash-promo-demo; mkdir -p $H/data
//   PORT=4399 ASH_DB=$H/data/ash.db ASH_RUNS_DIR=$H/data/runs ASH_UPLOADS_DIR=$H/data/uploads \
//     ASH_DEPS_DIR=$H/data/deps ASH_PREVIEW=1 node $ASH_REPO/server/dist/index.js &
//   node scripts/seed-demo.mjs --base http://localhost:4399 --home $H
//   node scripts/capture-shots.mjs --base http://localhost:4399 --ids $H/ids.json
//
// 两条写入通道，各管各的：
//   · 能走 HTTP 的走 HTTP（项目、分组、任务、备忘、随手记、聊天室）——形状由服务端自己保证；
//   · 「正在跑 / 审查到第几轮 / 已验收」这类运行态没有任何接口能设（那本来就该由真实的 agent 跑出来），
//     所以在服务启动之后直接写库；会话正文与审查报告是 runs 目录下的文件，按 ash 自己的落盘格式写。
// 实例必须带 ASH_RUNS_DIR 启动：那同时是「绝不拉起真实 CLI」的保险。
import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BASE_FILES, COMMITS, revise, scaffold } from "./demo-code.mjs";
import { AGENTS, CHAT, DUET, GROUPS, NOTES, PROJECTS, TASKS, TEAM } from "./demo-data.mjs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://localhost:4399");
const HOME = arg("home", "/tmp/ash-promo-demo");
const RUNS = join(HOME, "data", "runs");
const db = new DatabaseSync(join(HOME, "data", "ash.db"));

const NOW = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const minsAgo = (m) => NOW - m * 60_000;
let seq = 0;
const uid = (prefix) => `${prefix}-${(++seq).toString(36).padStart(4, "0")}`;

async function api(method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { "content-type": "application/json", origin: BASE },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

/** `UPDATE <table> SET … WHERE id = ?`，只写给了值的列。 */
function patchRow(table, id, cols, key = "id") {
  const names = Object.keys(cols);
  if (!names.length) return;
  db.prepare(`UPDATE ${table} SET ${names.map((n) => `${n} = ?`).join(", ")} WHERE ${key} = ?`)
    .run(...names.map((n) => cols[n]), id);
}
function insertRow(table, cols) {
  const names = Object.keys(cols);
  db.prepare(`INSERT INTO ${table} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`)
    .run(...names.map((n) => cols[n]));
}
function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

// ── 执行器 ────────────────────────────────────────────────────────────
const executorId = (type) => `ex-${type}`;
const executorLabel = Object.fromEntries(AGENTS.map(([type, name]) => [type, name]));
const AGENT_MODEL = Object.fromEntries(AGENTS.map(([type, , model]) => [type, model || null]));
function seedAgents() {
  for (const [type, name, model] of AGENTS) {
    insertRow("agents", { id: executorId(type), name, type, model, extra_args: "[]", config_overrides: "{}", is_default: 1 });
  }
}

// ── 项目：各配一个真的小仓库，任务分支、提交与 diff 都是真的 ─────────────────
const projectId = {};
const repoPath = {};
function git(dir, args, at) {
  const date = at ? iso(at) : undefined;
  return execFileSync("git", ["-C", dir, "-c", "user.name=Lumen", "-c", "user.email=dev@lumen.example", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    env: date ? { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : process.env,
  }).toString().trim();
}

/** 任务碰过哪些文件：会话里的写/改工具调用，加上数据里手填的 `touch`。 */
function touchedBy(t) {
  const out = [];
  const steps = (t.turns ?? []).flatMap((turn, round) => turn.steps.map((step) => [round, ...step]));
  for (const [round, kind, name, detail] of steps) {
    const op = kind === "tool" ? String(name).toLowerCase() : "";
    if (op !== "edit" && op !== "write") continue;
    out.push({ round, op, path: detail.startsWith("{") ? JSON.parse(detail).file_path : detail.split(" ")[0] });
  }
  for (const [op, path] of t.touch ?? []) out.push({ round: 0, op, path });
  return out;
}

async function seedProjects() {
  for (const p of PROJECTS) {
    const dir = join(HOME, "repos", p.name);
    const files = { ...BASE_FILES[p.key] };
    // 被「改」的文件得先在 main 上存在，diff 里才有删有增。
    for (const t of TASKS.filter((x) => x.project === p.key && !COMMITS[x.key])) {
      for (const { op, path } of touchedBy(t)) if (op === "edit") files[path] ??= scaffold(path);
    }
    for (const [file, content] of Object.entries(files)) writeFile(join(dir, file), content);
    writeFile(join(dir, ".gitignore"), ".worktrees/\n");
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "init"], minsAgo(60 * 24 * 3));
    repoPath[p.key] = dir;
    projectId[p.key] = (await api("POST", "/projects", { name: p.name, repoPath: dir })).id;
  }
}

/**
 * 给任务开真的 worktree 与分支（名字用 ash 自己的约定 `ash/<taskId 前 8 位>`），按回合各提交一次。
 * `turnEnds[i]` 是第 i 回合的结束时间，提交时间跟着它走。
 */
function seedWorktree(t, id, turnEnds) {
  const repo = repoPath[t.project];
  const branch = `ash/${id.slice(0, 8)}`;
  const path = join(repo, ".worktrees", id);
  const startCommit = git(repo, ["rev-parse", "main"]);
  git(repo, ["worktree", "add", "-q", "-b", branch, path, "main"]);
  const commit = (message, files, at) => {
    for (const [file, content] of Object.entries(files)) writeFile(join(path, file), content);
    git(path, ["add", "-A"]);
    git(path, ["commit", "-q", "-m", message], at);
  };
  const last = turnEnds.at(-1);
  if (COMMITS[t.key]) {
    COMMITS[t.key].forEach((c, index, all) => commit(c.message, c.files, last - (all.length - 1 - index) * 95_000));
  } else {
    const touched = touchedBy(t);
    if (!touched.length) touched.push({ round: 0, op: "write", path: `src/${t.key}.ts` });
    const rounds = [...new Set(touched.map((x) => x.round))].sort();
    for (const round of rounds) {
      const files = {};
      for (const { op, path: file } of touched.filter((x) => x.round === round)) {
        const current = join(path, file);
        files[file] = op === "edit" && existsSync(current) ? revise(readFileSync(current, "utf8"), round + 1) : scaffold(file, 7);
      }
      commit(round === 0 ? t.title : `按第 ${round} 轮审查意见修复`, files, turnEnds[round] ?? last);
    }
  }
  return { repo, branch, path, startCommit };
}

/** 验收：合回 main、清掉 worktree 与分支，跟 ash 真验收之后留下的现场一致。 */
function mergeAccepted(t, tree, at) {
  const base = git(tree.repo, ["rev-parse", "main"]);
  const source = git(tree.repo, ["rev-parse", tree.branch]);
  git(tree.repo, ["merge", "-q", "--no-ff", "-m", `合并 ${tree.branch}：${t.title}`, tree.branch], at);
  const merge = git(tree.repo, ["rev-parse", "main"]);
  git(tree.repo, ["worktree", "remove", "--force", tree.path]);
  git(tree.repo, ["branch", "-q", "-D", tree.branch]);
  return {
    acceptance_id: uid("acc"), accepted_target_branch: "main", accepted_base_commit: base,
    accepted_merge_commit: merge, accepted_source_commit: source,
    accepted_merge_method: "merge_commit", accepted_gate_mode: "passed",
  };
}

// ── 会话：一份 DSL 同时产出 sessions / session_turns 行与 .md / .trace.jsonl ──
const RS = "\x1e";
const STEP_MS = 14_000;
const TURN_GAP_MS = 60_000;
const turnSpan = (turn) => (turn.steps.length + 2) * STEP_MS + (turn.gapBefore ?? TURN_GAP_MS);
/**
 * 从 `endsAt` 往回推出起点，再按固定间隔往后排事件。收尾的回合写 agentEnd，
 * 运行中的最后一回合不写——界面据此判断「这一轮还没说完」。
 * `turn.after` 是这一回合结束后写进时间线的旁注（`[距回合结束多少毫秒, 文案]`），审查轮次卡靠它成形；
 * `turn.verifyRound` 标出这一回合是第几轮审查者在说话。
 */
function writeSession({ taskId, role, agent, project, tree, turns, running, endsAt, model }) {
  const sessionId = uid("ses");
  const base = join(RUNS, taskId, sessionId);
  const md = [];
  const trace = [];
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, costUsd: 0 };
  let cursor = endsAt - turns.reduce((sum, turn) => sum + turnSpan(turn), 0) + (turns[0].gapBefore ?? TURN_GAP_MS);
  const sessionStart = cursor;
  const spans = [];
  turns.forEach((turn, index) => {
    if (index > 0) cursor += turn.gapBefore ?? TURN_GAP_MS;
    const open = running && index === turns.length - 1;
    const turnStart = cursor;
    const startedAt = iso(cursor);
    const head = turn.system
      ? { t: "user", by: "system", agent, text: turn.system, at: startedAt }
      : { t: "user", agent, text: turn.user, at: startedAt };
    md.push(`${RS}${JSON.stringify(head)}\n`);
    const push = (event) => {
      cursor += STEP_MS;
      trace.push(JSON.stringify({ at: iso(cursor), turnStartedAt: startedAt, event }));
    };
    push({ kind: "run", model: model ?? null, reasoningEffort: null, ...(turn.verifyRound ? { verifyRound: turn.verifyRound } : {}) });
    for (const [kind, a, b] of turn.steps) {
      if (kind === "tool") push({ kind: "tool", name: a, ...(b ? { detail: b } : {}) });
      else if (kind === "thinking") push({ kind: "thinking", text: a });
      else {
        push({ kind: "text", text: a });
        md.push(`\n${a}\n`);
      }
    }
    if (turn.usage) {
      for (const k of Object.keys(usage)) usage[k] += turn.usage[k] ?? 0;
      // 形状不合 isTokenUsage 的一行会让整份 trace 被判坏：turns 必填，accounting 不认识的值不能写。
      if (!open) push({ kind: "usage", usage: { ...turn.usage, turns: 1 } });
    }
    cursor += STEP_MS;
    if (!open) md.push(`${RS}${JSON.stringify({ t: "agentEnd", at: iso(cursor) })}\n`);
    for (const [offset, text] of turn.after ?? []) {
      md.push(`${RS}${JSON.stringify({ t: "system", agent, text, aside: true, at: iso(cursor + offset) })}\n`);
    }
    insertRow("session_turns", {
      id: uid("turn"), session_id: sessionId, task_id: taskId, started_at: startedAt,
      ended_at: open ? null : iso(cursor), outcome: open ? null : "completed",
    });
    spans.push({ start: turnStart, end: cursor });
  });
  writeFile(`${base}.md`, md.join(""));
  writeFile(`${base}.trace.jsonl`, `${trace.join("\n")}\n`);
  const cwd = tree?.path ?? repoPath[project];
  insertRow("sessions", {
    id: sessionId, task_id: taskId, role, agent_type: agent, executor: executorLabel[agent], executor_id: executorId(agent),
    cwd, worktree_path: tree?.path ?? null, branch: tree?.branch ?? "main", started_at: iso(sessionStart),
    ended_at: running ? null : iso(cursor), exit_status: running ? null : 0,
    turn_started_at: running ? iso(spans.at(-1).start) : null,
    active_ms: cursor - sessionStart,
    usage_input: usage.input, usage_output: usage.output, usage_cache_read: usage.cacheRead,
    usage_cache_write: usage.cacheWrite, usage_reasoning: usage.reasoning, usage_cost_usd: usage.costUsd,
    usage_turns: turns.length, context_used: Math.min(180_000, usage.input + usage.cacheRead / 4), context_window: 200_000,
    turn_model: model ?? null,
  });
  return spans;
}

// ── 任务 ──────────────────────────────────────────────────────────────
const taskId = {};
const groupId = {};
/** 散任务各开一个 worktree；团队执行者共用调度台的目录，不开。 */
const hasTree = (t) => !t.shared && (!!t.turns || !!t.accepted);

async function createTask(t, extra = {}) {
  const created = await api("POST", "/tasks", {
    projectId: projectId[t.project], title: t.title, body: t.body ?? "",
    agentType: t.agent, executorId: t.agent ? executorId(t.agent) : undefined,
    groupId: t.group ? groupId[t.group] : undefined, useWorktree: hasTree(t), ...extra,
  });
  taskId[t.key] = created.id;
  return created.id;
}

// 审查一轮的时间窗：执行回合收尾后半分钟开审，审查者说完再过一会儿落结论。
const REVIEW_LEAD_MS = 30_000;
const REVIEW_SPAN_MS = 170_000;
const REVIEW_DEFAULT_STEPS = [
  ["tool", "exec", "git diff --stat main...HEAD"],
  ["tool", "exec", "npm run build"],
  ["tool", "exec", "npx playwright test --grep @smoke"],
  ["text", "结论与依据已写入本轮报告。"],
];

/** 把审查轮次织进执行会话的回合：每一轮跟在一个执行回合后面，旁注圈出那一段。 */
function withReviewAsides(t) {
  if (!t.review) return t.turns;
  const reviewer = executorLabel[t.review.reviewer];
  return t.turns.map((turn, index) => {
    const round = t.review.rounds[index];
    if (!round) return turn;
    const n = index + 1;
    const after = [[REVIEW_LEAD_MS, `自由工作流第 ${n} 轮审查开始：${reviewer} · 逻辑检查。`]];
    if (round.status === "passed") after.push([REVIEW_LEAD_MS + REVIEW_SPAN_MS, `自由工作流第 ${n} 轮审查通过（${reviewer}）。`]);
    if (round.status === "failed") {
      after.push([REVIEW_LEAD_MS + REVIEW_SPAN_MS, `自由工作流第 ${n} 轮审查未通过，意见已放入待发送队列；修复正常结束后按最新预约复审。`]);
    }
    return { ...turn, after };
  }).map((turn, index) => (index > 0 && t.review.rounds[index - 1] ? { ...turn, gapBefore: REVIEW_LEAD_MS + REVIEW_SPAN_MS + 20_000 } : turn));
}

/** 任务建好之后才落运行态：建的时候服务端只认 backlog。 */
function settleTask(t, id) {
  const created = minsAgo(t.ago ?? 30);
  const running = t.status === "running";
  const reviewing = t.review?.status === "reviewing";
  // 审完的：最后一轮的时间窗排在任务收尾之前，「更新时间」才是整条链真正停下的那一刻。
  // 还在审的：执行回合两分钟前刚收尾，审查者此刻正在看。
  const reviewTail = t.review && !reviewing ? REVIEW_LEAD_MS + REVIEW_SPAN_MS : 0;
  const settled = created + Math.min((t.ago ?? 30) * 30_000, 25 * 60_000);
  const updated = running ? NOW - 20_000 : reviewing ? NOW - 140_000 : settled;
  const cols = {
    status: t.status, stage: t.stage ?? null,
    created_at: iso(created), updated_at: iso(updated),
    started_at: t.status === "backlog" ? null : iso(created + 5_000),
    ended_at: ["done", "failed"].includes(t.status) ? iso(updated) : null,
  };
  if (t.pinned) cols.pinned_at = NOW;
  if (t.question) {
    cols.question = t.question;
    cols.question_options = JSON.stringify(t.questionOptions ?? []);
  }
  const turns = t.turns && withReviewAsides(t);
  const sessionEnd = running ? NOW - 20_000 : updated - reviewTail;
  const tree = hasTree(t) ? seedWorktree(t, id, turns ? turnEndsOf(turns, sessionEnd) : [updated]) : null;
  if (tree) Object.assign(cols, { worktree_base: "main", worktree_start_commit: tree.startCommit });
  let spans = [];
  if (turns) {
    spans = writeSession({
      taskId: id, role: t.role ?? "single", agent: t.agent, project: t.project, tree,
      turns, running, endsAt: sessionEnd, model: AGENT_MODEL[t.agent],
    });
  }
  if (t.review) seedReview(t, id, spans, tree);
  if (t.accepted) Object.assign(cols, mergeAccepted(t, tree, updated));
  patchRow("tasks", id, cols);
}

/** 不落盘先算出各回合的结束时间：提交要先于会话写入，时间却得对得上。 */
function turnEndsOf(turns, endsAt) {
  let cursor = endsAt - turns.reduce((sum, turn) => sum + turnSpan(turn), 0) + (turns[0].gapBefore ?? TURN_GAP_MS);
  return turns.map((turn, index) => {
    if (index > 0) cursor += turn.gapBefore ?? TURN_GAP_MS;
    cursor += (turn.steps.length + 2) * STEP_MS;
    return cursor;
  });
}

// ── 审查：一条链 + 若干轮；意见正文是 runs 目录下的 report.md，审查者另开一条会话 ──
function seedReview(t, id, spans, tree) {
  const { status, reviewer, rounds } = t.review;
  const runId = uid("frr");
  const roundStart = (index) => spans[index].end + REVIEW_LEAD_MS;
  for (const span of spans) {
    insertRow("free_workflow_events", {
      id: uid("fwe"), task_id: id, kind: "task_execution", source: "agent",
      detail: JSON.stringify({ status: "completed", endedAt: iso(span.end) }), occurred_at: iso(span.start),
    });
  }
  const last = roundStart(rounds.length - 1) + REVIEW_SPAN_MS;
  insertRow("free_review_runs", {
    id: runId, task_id: id, reviewer_name: executorLabel[reviewer], agent_type: reviewer, executor_id: executorId(reviewer),
    check_mode: "logic", target_kind: "workspace", retry_limit: 3, current_round: rounds.length, status,
    created_at: iso(roundStart(0)), updated_at: iso(last), finished_at: status === "reviewing" ? null : iso(last),
  });
  rounds.forEach((round, index) => {
    const started = roundStart(index);
    const open = round.status === "reviewing";
    insertRow("free_review_rounds", {
      id: uid("frd"), run_id: runId, round: index + 1, status: round.status, conclusion: round.conclusion ?? null,
      started_at: iso(started), ended_at: open ? null : iso(started + REVIEW_SPAN_MS),
    });
    if (round.report) writeFile(join(RUNS, id, "free-review", runId, `round-${index + 1}`, "report.md"), round.report);
    const steps = open ? REVIEW_DEFAULT_STEPS.slice(0, 2) : REVIEW_DEFAULT_STEPS;
    writeSession({
      taskId: id, role: "reviewer", agent: reviewer, project: t.project, tree, running: open, model: AGENT_MODEL[reviewer],
      turns: [{ system: `审查「${t.title}」第 ${index + 1} 轮：逻辑检查。`, steps, verifyRound: index + 1, gapBefore: 0 }],
      endsAt: open ? NOW - 15_000 : started + REVIEW_SPAN_MS - 10_000,
    });
  });
  insertRow("free_workflow_states", { task_id: id, review_armed: 0, review_run_id: runId, updated_at: iso(roundStart(0)) });
}

async function seedTasks() {
  for (const g of GROUPS) {
    groupId[g.key] = (await api("POST", "/groups", { projectId: projectId[g.project], name: g.name, mode: g.mode })).id;
  }
  for (const t of TASKS) await createTask(t);
  // 队列直接写库：`POST /queues` 建完会当场去起队首，这套实例拦着真 CLI，队首落 failed 后还会接着去试下一个，
  // 每次都留下一条报错会话。队列本身只是 queue_items 里共用一个 queue_id 的几行。
  const queueId = uid("que");
  TASKS.filter((t) => t.group === "pay").forEach((t, position) => {
    insertRow("queue_items", { task_id: taskId[t.key], queue_id: queueId, position, created_at: iso(minsAgo(t.ago)) });
  });
  for (const t of TASKS) {
    for (const body of t.memos ?? []) await api("POST", `/tasks/${taskId[t.key]}/memos`, { body });
  }
  // 已验收的先落：它们的合并提交进了 main，后开的分支才是从合并后的 main 上分出去的。
  for (const t of [...TASKS].sort((a, b) => Number(!!b.accepted) - Number(!!a.accepted) || (b.ago ?? 0) - (a.ago ?? 0))) {
    settleTask(t, taskId[t.key]);
  }
}

// ── 团队：调度台是一个 mode=team 的任务，执行者是挂在它名下的普通任务 ─────────
async function seedTeam() {
  const team = {
    lead: TEAM.lead, worker: TEAM.worker,
    leadExecutorId: executorId(TEAM.lead), workerExecutorId: executorId(TEAM.worker),
    review: true, reviewerAgentType: "gemini", reviewerExecutorId: executorId("gemini"),
  };
  const lead = { ...TEAM, agent: TEAM.lead, shared: true };
  const leadId = await createTask(lead, { mode: "team", team });
  const group = await api("POST", "/groups", { projectId: projectId[TEAM.project], name: "通知中心", mode: "parallel" });
  patchRow("groups", group.id, { owner_task_id: leadId });
  for (const [index, w] of TEAM.workers.entries()) {
    const worker = { ...w, project: TEAM.project, shared: true, ago: TEAM.ago - 4 - index * 3 };
    const id = await createTask(worker, { parentId: leadId, groupId: group.id });
    settleTask(worker, id);
  }
  // 调度台没有 done：两个执行者还在跑，它就停在 idle 等他们叫醒。
  settleTask({ ...lead, status: "idle", role: "lead" }, leadId);
}

// ── 讨论：回合不在库里，是 runs/<task>/transcript.jsonl 的一行一回合 ─────────
async function seedDuet() {
  const duet = {
    topic: DUET.topic, style: "duet", voiceA: DUET.voiceA, voiceB: DUET.voiceB,
    voiceAExecutorId: executorId(DUET.voiceA), voiceBExecutorId: executorId(DUET.voiceB), maxRounds: 4, gateG1: "on",
  };
  const id = await createTask({ ...DUET, body: DUET.topic }, { mode: "duet", duet });
  const start = minsAgo(DUET.ago);
  const lines = DUET.turns.map((turn, index) => {
    const startedAt = start + index * 150_000;
    return JSON.stringify({
      round: Math.floor(index / 2) + 1, speaker: turn.speaker, text: turn.text,
      startedAt: iso(startedAt), at: iso(startedAt + 110_000), durationMs: 110_000,
      ...(turn.agrees ? { agrees: true } : {}),
    });
  });
  lines.push(JSON.stringify({
    type: "duet.gate", taskId: id, gate: "G1", open: true, version: 1,
    consensus: true, consensusBy: "both", conclusionA: DUET.conclusionA, conclusionB: DUET.conclusionB,
  }));
  writeFile(join(RUNS, id, "transcript.jsonl"), `${lines.join("\n")}\n`);
  patchRow("tasks", id, {
    status: "awaiting_review", created_at: iso(start), updated_at: iso(start + DUET.turns.length * 150_000),
    started_at: iso(start), duet_gate_version: 1,
  });
}

// ── 聊天室：发消息会真的去叫 agent，所以房间走接口、消息直接写库 ─────────────
async function seedChat() {
  const room = await api("POST", "/chats", {
    projectId: projectId[CHAT.project], name: CHAT.name,
    members: CHAT.members.map((m) => ({ ...m, executorId: executorId(m.agentType) })),
  });
  const start = minsAgo(38);
  CHAT.messages.forEach((m, index) => {
    const member = CHAT.members.find((x) => x.id === m.member);
    insertRow("chat_messages", {
      id: uid("msg"), room_id: room.id, role: m.role ?? "assistant", member_id: member?.id ?? null,
      author: member?.name ?? "你", body: m.body, mentions: "[]", status: "done",
      trace: m.trace ? JSON.stringify(m.trace) : null, created_at: iso(start + index * 95_000),
    });
  });
}

async function seedNotes() {
  for (const body of NOTES) await api("POST", "/notes", { projectId: projectId.web, body });
}

seedAgents();
await seedProjects();
await seedTasks();
await seedTeam();
await seedDuet();
await seedChat();
await seedNotes();
// 服务端的队列推进若在我们写完之后又动了哪个任务，这里当场报出来，别等截图上才发现。
await new Promise((resolve) => setTimeout(resolve, 2500));
for (const t of TASKS) {
  const actual = (await api("GET", `/tasks/${taskId[t.key]}`)).status;
  if (actual !== t.status) console.warn(`状态漂移：${t.key} 期望 ${t.status}，实际 ${actual}`);
}
db.close();
// 截图脚本靠这份清单拼地址。
writeFile(join(HOME, "ids.json"), JSON.stringify({ projectId, taskId }, null, 2));
console.log(`seeded ${Object.keys(taskId).length} tasks → ${join(HOME, "ids.json")}`);
