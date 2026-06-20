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
    const progRes = await fetch(`https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/${date}`, { headers: H });
    if (!progRes.ok) throw new Error(`Programme HTTP ${progRes.status}`);
    const progData = await progRes.json();
    const reunions = progData?.programme?.reunions || [];

    const results = [];

    for (const reunion of reunions) {
      const rNum = reunion.numOfficiel || reunion.numReunion;
      const hippo = reunion.hippodrome?.libelleLong || reunion.hippodrome?.libelleCourt || "";
      for (const course of (reunion.courses || [])) {
        const disc = (course.discipline || course.specialite || "").toUpperCase();
        if (!disc.includes("ATTELE")) continue;

        try {
          const [partRes, perfRes, rapRes] = await Promise.all([
            fetch(
              `https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/${date}/R${rNum}/C${course.numOrdre}/participants?specialisation=OFFLINE`,
              { headers: H }
            ),
            fetch(
              `https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/${date}/R${rNum}/C${course.numOrdre}/performances-detaillees/pretty`,
              { headers: H }
            ).catch(() => null),
            fetch(
              `https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/${date}/R${rNum}/C${course.numOrdre}/rapports-definitifs`,
              { headers: H }
            ).catch(() => null)
          ]);

          if (!partRes.ok) continue;
          const partData = await partRes.json();
          const participants = partData.participants || [];

          let perfMap = {};
          if (perfRes && perfRes.ok) {
            try {
              const perfData = await perfRes.json();
              (perfData.participants || []).forEach(pp => {
                perfMap[pp.nomCheval || pp.nom] = pp.coursesCourues || [];
              });
            } catch (e) {}
          }

          // Récupère les rapports définitifs par type de pari
          let rapports = null;
          if (rapRes && rapRes.ok) {
            try { rapports = await rapRes.json(); } catch(e) {}
          }

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
              rapports,
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
                coursesCourues: (perfMap[p.nom] || []).slice(0, 6).map(c => ({
                  allocation: c.allocation,
                  hippodrome: c.hippodrome,
                  date: c.date,
                  place: (() => {
                    const moi = (c.participants || []).find(x => (x.nomCheval || '').toUpperCase() === (p.nom || '').toUpperCase());
                    return moi?.place?.place || null;
                  })(),
                  participants: (c.participants || []).map(x => ({
                    nomCheval: x.nomCheval,
                    place: x.place?.place || null,
                    reductionKilometrique: x.reductionKilometrique || null,
                    itsHim: (x.nomCheval || '').toUpperCase() === (p.nom || '').toUpperCase()
                  }))
                }))
              })),
            });
          }
        } catch (e) {}
      }
    }

    res.status(200).json({ date, courses: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
