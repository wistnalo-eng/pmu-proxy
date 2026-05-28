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

  // Plusieurs formats d'URL possibles selon l'API PMU
  const urls = [
    `https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/${date}/R${reunion}/C${course}/performances-detaillees/pretty`,
    `https://online.turfinfo.api.pmu.fr/rest/client/61/programme/${date}/R${reunion}/C${course}/performances-detaillees/pretty`,
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: H });
      if (r.ok) {
        const data = await r.json();
        return res.status(200).json(data);
      }
    } catch (e) { /* essaie l'URL suivante */ }
  }

  return res.status(404).json({ error: "Performances détaillées introuvables" });
}
