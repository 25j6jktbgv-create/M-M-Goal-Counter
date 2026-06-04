// === WM2026 WIDGET-LOGIK (auf GitHub, frei editierbar) ===
async function getData(apiKey) {
  const LEAGUE = 1, SEASON = 2026;
  const url = `https://v3.football.api-sports.io/fixtures?league=${LEAGUE}&season=${SEASON}`;
  const req = new Request(url);
  req.headers = { "x-apisports-key": apiKey };
  const res = await req.loadJSON();

  let goals = 0, played = 0;
  for (const f of res.response) {
    if (f.goals.home !== null && f.goals.away !== null) {
      goals += f.goals.home + f.goals.away;
      if (["FT", "AET", "PEN"].includes(f.fixture.status.short)) played++;
    }
  }
  return { goals, played };
}

async function buildWidget(cfg) {
  const data = await getData(cfg.apiKey);

  const w = new ListWidget();
  w.backgroundColor = new Color("#0b3d2e");
  w.setPadding(16, 16, 16, 16);

  const title = w.addText("WM 2026");
  title.font = Font.mediumSystemFont(13);
  title.textColor = Color.white();
  w.addSpacer(4);

  const goals = w.addText(`${data.goals}`);
  goals.font = Font.boldSystemFont(46);
  goals.textColor = Color.white();

  const label = w.addText("Tore insgesamt");
  label.font = Font.systemFont(12);
  label.textColor = new Color("#a7d7c5");
  w.addSpacer(6);

  const sub = w.addText(`${data.played} Spiele gespielt`);
  sub.font = Font.systemFont(11);
  sub.textColor = new Color("#a7d7c5");

  return w;
}

module.exports = { buildWidget };
