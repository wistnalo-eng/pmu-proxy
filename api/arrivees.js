export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date manquante (DDMMYYYY)" });

  const H = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };

  try {
    // 1. Récupère le programme du jour
    const progRes = await fetch(`https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/${date}`, { headers: H });
    if (!progRes.ok) throw new Error(`Programme HTTP ${progRes.status}`);
    const progData = await progRes.json();
    const reunions = progData?.programme?.reunions || [];

    const results = [];

    // 2. Pour chaque course de trot attelé, récupère les arrivées
    for (const reunion of reunions) {
      const rNum = reunion.numOfficiel || reunion.numReunion;
      const hippo = reunion.hippodrome?.libelleLong || reunion.hippodrome?.libelleCourt || "";
      for (const course of (reunion.courses || [])) {
        const disc = (course.discipline || course.specialite || "").toUpperCase();
        if (!disc.includes("ATTELE")) continue;

        try {
          const partRes = await fetch(
            `https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/${date}/R${rNum}/C${course.numOrdre}/participants?specialisation=OFFLINE`,
            { headers: H }
          );
          if (!partRes.ok) continue;
          const partData = await partRes.json();
          const participants = partData.participants || [];

          // Construit l'arrivée à partir de ordreArrivee
          const arrivee = participants
            .filter(p => p.ordreArrivee && p.ordreArrivee > 0)
            .sort((a, b) => a.ordreArrivee - b.ordreArrivee)
            .slice(0, 5)
            .map(p => p.numPmu);

          if (arrivee.length >= 3) {
            results.push({
              id: `R${rNum}C${course.numOrdre}`,
              reunion: rNum,
              course: course.numOrdre,
              hippodrome: hippo,
              nom: course.libelle || course.libelleCourt || "",
              distance: course.distance,
              partants: course.nombreDeclaresPartants || course.nombrePartants,
              allocation: course.montantPrix || course.montantTotalOffert || course.montantAlloue || null,
              conditions: course.categorieParticularite || "",
              isQuinte: (course.libelle || "").toLowerCase().includes("quinté") || (course.categorieStatut || "").includes("QUINTE"),
              arrivee,
              // Données partants pour le scoring E1+E2 du backtest
              participants: participants.map(p => ({
                numPmu: p.numPmu,
                nom: p.nom,
                driver: p.driver,
                entraineur: p.entraineur,
                musique: p.musique,
                deferre: p.deferre,
                driverChange: p.driverChange,
                nombreCourses: p.nombreCourses,
                nombreVictoires: p.nombreVictoires,
                nombrePlaces: p.nombrePlaces,
                gainsParticipant: p.gainsParticipant,
                reductionKilometrique: p.reductionKilometrique,
                avisEntraineur: p.avisEntraineur,
                ordreArrivee: p.ordreArrivee,
                dernierRapportReference: p.dernierRapportReference,
              })),
            });
          }
        } catch (e) { /* skip course en erreur */ }
      }
    }

    res.status(200).json({ date, courses: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
