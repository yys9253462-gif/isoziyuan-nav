import { createSession, json, requestJson, sessionCookie } from "../../_utils.js";

export async function onRequestPost({ request, env }) {
  const payload = await requestJson(request);
  const username = String(payload?.username || "").trim();
  const password = String(payload?.password || "");
  const expectedUsername = env.ADMIN_USERNAME || "admin";
  if (!env.ADMIN_PASSWORD) return json({ success: false, error: "后台密码尚未配置，请先设置 ADMIN_PASSWORD" }, 503);
  if (username !== expectedUsername || password !== env.ADMIN_PASSWORD) {
    return json({ success: false, error: "账号或密码错误" }, 401);
  }
  const token = await createSession(username, env.ADMIN_PASSWORD);
  return json({ success: true, message: "登录成功" }, 200, { "set-cookie": sessionCookie(token) });
}
