import { json, loadNavData, requestJson, requireSession, saveNavData } from "../../_utils.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;
  if (!env.NAV_DB) return json({ success: false, error: "导航数据库尚未绑定" }, 503);
  try {
    return json({ success: true, data: await loadNavData(env.NAV_DB) });
  } catch (error) {
    return json({ success: false, error: error.message || "读取导航数据失败" }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;
  if (!env.NAV_DB) return json({ success: false, error: "导航数据库尚未绑定" }, 503);
  const payload = await requestJson(request);
  try {
    const data = await saveNavData(env.NAV_DB, payload?.data);
    return json({ success: true, data, message: "导航数据已保存" });
  } catch (error) {
    return json({ success: false, error: error.message || "保存导航数据失败" }, 400);
  }
}
