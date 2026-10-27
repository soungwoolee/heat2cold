// 사우나 3행시 모음 · 이모지 반응 · 댓글
import { getStore } from "@netlify/blobs";

const EMOJIS = ["🔥", "🧊", "😂", "👏", "🥵"];
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET,POST,OPTIONS" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });
const clean = (s, n) => String(s ?? "").replace(/[<>]/g, "").trim().slice(0, n);

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const store = getStore({ name: "poems", consistency: "strong" });
  if (req.method === "GET") {
    const { blobs } = await store.list();
    const items = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter(Boolean);
    items.sort((a, b) => (a.at < b.at ? 1 : -1));
    return json(items);
  }
  const body = await req.json().catch(() => ({}));
  if (body.action === "add") {
    const lines = [clean(body.p1, 60), clean(body.p2, 60), clean(body.p3, 60)];
    if (!lines.some(Boolean)) return json({ ok: false }, 400);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await store.setJSON(id, { id, by: clean(body.by, 24) || "익명", lines, reactions: {}, comments: [], at: new Date().toISOString() });
    return json({ ok: true, id });
  }
  const id = clean(body.id, 40);
  const item = id && (await store.get(id, { type: "json" }));
  if (!item) return json({ ok: false }, 404);
  if (body.action === "react") {
    if (!EMOJIS.includes(body.emoji)) return json({ ok: false }, 400);
    item.reactions[body.emoji] = (item.reactions[body.emoji] || 0) + 1;
  } else if (body.action === "comment") {
    const text = clean(body.text, 120);
    if (!text) return json({ ok: false }, 400);
    item.comments.push({ nick: clean(body.nick, 12) || "익명", text, at: new Date().toISOString() });
    item.comments = item.comments.slice(-200);
  } else return json({ ok: false }, 400);
  await store.setJSON(item.id, item);
  return json(item);
};

export const config = { path: "/api/poems" };
