export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date manquante" });

  try {
    const r = await fetch(
      `https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/${date}`,
      { headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" } }
    );
    if (!r.ok) throw new Error(`PMU HTTP ${r.status}`);
    const data = await r.json();
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
