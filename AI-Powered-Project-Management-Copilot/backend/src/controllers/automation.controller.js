import axios from "axios";

export async function triggerWeeklyReport(req, res, next) {
  try {
    const url = process.env.N8N_WEBHOOK_URL;
    if (!url) return res.json({ queued: false, message: "N8N_WEBHOOK_URL not configured" });
    const response = await axios.post(url, req.body);
    res.json({ queued: true, n8n: response.data });
  } catch (e) { next(e); }
}
