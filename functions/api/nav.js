import { json, loadNavData } from "../_utils.js";

export async function onRequestGet({ env }) {
  if (!env.NAV_DB) return json({ success: false, error: "导航数据库尚未绑定" }, 503);
  try {
    return json({ success: true, data: await loadNavData(env.NAV_DB) });
  } catch (error) {
    return json({ success: false, error: error.message || "读取导航数据失败" }, 500);
  }
}
