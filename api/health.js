import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const requiredSchema = {
  "姓名": "title",
  "提交时间": "date",
  "九字禅（声）": "number",
  "拜忏文（遍）": "number",
  "静禅（分钟）": "number",
  "动禅（分钟）": "number",
  "金刚经": "number",
  "阿弥陀经": "number",
  "普门品": "number",
  "普贤行愿品": "number",
  "地藏菩萨本愿经": "number",
  "心经": "number",
  "备注": "rich_text"
};

function getTypeString(propObj) {
  if (!propObj || typeof propObj !== "object") return "unknown";
  const keys = Object.keys(propObj);
  const typeKey = keys.find(k =>
    ["title","rich_text","number","date","select","multi_select","status","people","files","url","email","phone_number","checkbox","relation","formula","rollup","created_time","created_by","last_edited_time","last_edited_by","unique_id","verification"].includes(k)
  );
  return typeKey || "unknown";
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    if (!DATABASE_ID) {
      return res.status(400).json({ ok: false, error: "缺少环境变量 NOTION_DATABASE_ID" });
    }
    const db = await notion.databases.retrieve({ database_id: DATABASE_ID });

    const actual = {};
    for (const [name, def] of Object.entries(db.properties || {})) {
      actual[name] = getTypeString(def);
    }

    const checks = [];
    let allPass = true;

    for (const [reqName, reqType] of Object.entries(requiredSchema)) {
      const gotType = actual[reqName];
      if (!gotType) {
        allPass = false;
        checks.push({
          field: reqName, expected: reqType, actual: null, ok: false,
          advice: `缺少列「${reqName}」（期望类型：${reqType}）。请在数据库中新增该列，并设置为对应类型。`
        });
      } else if (gotType !== reqType) {
        allPass = false;
        checks.push({
          field: reqName, expected: reqType, actual: gotType, ok: false,
          advice: `列「${reqName}」类型不匹配：期望 ${reqType}，实际 ${gotType}。修改列类型可能会丢失数据，建议新建正确类型列并迁移数据后再删除旧列。`
        });
      } else {
        checks.push({ field: reqName, expected: reqType, actual: gotType, ok: true });
      }
    }

    const extras = Object.keys(actual).filter(k => !requiredSchema[k]);
    const extrasInfo = extras.map(name => ({ field: name, type: actual[name] }));

    return res.status(200).json({
      ok: allPass,
      database: { id: db.id, title: db.title?.[0]?.plain_text || "" },
      checks,
      extras: extrasInfo,
      hint: "若全部 ok，即可使用 /api/submit 写入数据。若有不匹配，按 advice 修正列名与类型。"
    });
  } catch (e) {
    const msg = e?.body?.message || e.message || String(e);
    return res.status(500).json({ ok: false, error: msg });
  }
}

