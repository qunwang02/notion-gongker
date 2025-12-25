import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const {
      title, date, name, chant9, repent, zenStatic, zenMove,
      jg, amt, pmp, px, dz, xj, note
    } = req.body || {};

    if (!title) return res.status(400).json({ error: "缺少必填字段：姓名（标题）" });

    const clamp04 = v => {
      const n = Number(v);
      if (!Number.isFinite(n)) return 0;
      return Math.max(0, Math.min(4, n));
    };

    const properties = {
      "姓名": { title: [{ type: "text", text: { content: String(title) } }] },
      "提交时间": date ? { date: { start: date } } : { date: null },
      "九字禅（声）": Number.isFinite(chant9) ? { number: Number(chant9) } : { number: 0 },
      "拜忏文（遍）": Number.isFinite(repent) ? { number: Number(repent) } : { number: 0 },
      "静禅（分钟）": Number.isFinite(zenStatic) ? { number: Number(zenStatic) } : { number: 0 },
      "动禅（分钟）": Number.isFinite(zenMove) ? { number: Number(zenMove) } : { number: 0 },
      "金刚经": { number: clamp04(jg) },
      "阿弥陀经": { number: clamp04(amt) },
      "普门品": { number: clamp04(pmp) },
      "普贤行愿品": { number: clamp04(px) },
      "地藏菩萨本愿经": { number: clamp04(dz) },
      "心经": { number: clamp04(xj) },
      "备注": note ? { rich_text: [{ type: "text", text: { content: String(note) } }] } : { rich_text: [] }
    };

    const resp = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties,
      children: note
        ? [{
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ type: "text", text: { content: String(note) } }] }
          }]
        : []
    });

    return res.status(200).json({ ok: true, pageId: resp.id });
  } catch (e) {
    const msg = e?.body?.message || e.message || String(e);
    return res.status(500).json({ error: msg });
  }
}