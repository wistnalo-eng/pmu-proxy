export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { date, reunion, course } = req.query;
  if (!date || !reunion || !course) {
    return res.status(400).json({ error: "Paramètres manquants: date, reunion, course" });
  }

  const H = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };

  try {
    const url = `https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/${date}/R${reunion}/C${course}/rapports-definitifs`;
    const r = await fetch(url, { headers: H });
    if (!r.ok) throw new Error(`PMU HTTP ${r.status}`);
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
