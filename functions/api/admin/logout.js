import { clearSessionCookie, json } from "../../_utils.js";

export async function onRequestPost() {
  return json({ success: true }, 200, { "set-cookie": clearSessionCookie() });
}
