// === WM Widget-Logik (auf GitHub, frei editierbar) ===
// Quelle: api-sports. KEIN API-Key hier drin – kommt vom Loader.

const LEAGUE = 1;       // 1 = FIFA World Cup
const SEASON = 2022;    // <<< NUR DIESE ZEILE auf 2026 ändern, wenn die Quelle dafür steht

// ---------- Daten ----------
async function apiGet(url, apiKey) {
  const req = new Request(url);
  req.headers = { "x-apisports-key": apiKey };
  req.timeoutInterval = 15;
  return await req.loadJSON();
}

async function getFixtures(apiKey) {
  const url = `https://v3.football.api-sports.io/fixtures?league=${LEAGUE}&season=${SEASON}`;
  const res = await apiGet(url, apiKey);
  let goals = 0, played = 0;
  for (const f of (res.response || [])) {
    if (f.goals.home !== null && f.goals.away !== null) {
      goals += f.goals.home + f.goals.away;
      if (["FT", "AET", "PEN"].includes(f.fixture.status.short)) played++;
    }
  }
  return { goals, played };
}

async function getTopScorer(apiKey) {
  const url = `https://v3.football.api-sports.io/players/topscorers?league=${LEAGUE}&season=${SEASON}`;
  const res = await apiGet(url, apiKey);
  const top = res.response && res.response[0];
  if (!top) return null;
  return {
    name:  top.player.name,
    goals: top.statistics[0].goals.total,
    team:  top.statistics[0].team.name
  };
}

// ---------- Widget ----------
const WHITE  = Color.white();
const ACCENT = new Color("#a7d7c5");

function baseWidget() {
  const w = new ListWidget();
  w.backgroundColor = new Color("#0b3d2e");
  w.setPadding(16, 16, 16, 16);
  return w;
}

async function buildWidget(cfg) {
  const family = cfg.family || "medium";          // manueller Lauf => medium
  return family === "small" ? buildSmall(cfg) : buildMedium(cfg);
}

// kleines Widget (deine ursprüngliche Variante)
async function buildSmall(cfg) {
  const fx = await getFixtures(cfg.apiKey);
  const w = baseWidget();

  const title = w.addText("WM " + SEASON);
  title.font = Font.mediumSystemFont(13); title.textColor = WHITE;
  w.addSpacer(4);

  const g = w.addText(String(fx.goals));
  g.font = Font.boldSystemFont(46); g.textColor = WHITE;

  const l = w.addText("Tore insgesamt");
  l.font = Font.systemFont(12); l.textColor = ACCENT;
  w.addSpacer(6);

  const s = w.addText(fx.played + " Spiele gespielt");
  s.font = Font.systemFont(11); s.textColor = ACCENT;
  return w;
}

// großes Widget: Tore + Ø/Spiel + Torschützenkönig
async function buildMedium(cfg) {
  const [fx, top] = await Promise.all([
    getFixtures(cfg.apiKey),
    getTopScorer(cfg.apiKey)
  ]);
  const avg = fx.played > 0
    ? (fx.goals / fx.played).toFixed(2).replace(".", ",")
    : "–";

  const w = baseWidget();

  const title = w.addText("WM " + SEASON);
  title.font = Font.mediumSystemFont(13); title.textColor = WHITE;
  w.addSpacer(8);

  // Hauptzeile: große Zahl links, Stats rechts
  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const left = row.addStack(); left.layoutVertically();
  const big = left.addText(String(fx.goals));
  big.font = Font.boldSystemFont(44); big.textColor = WHITE;
  const bigL = left.addText("Tore insgesamt");
  bigL.font = Font.systemFont(11); bigL.textColor = ACCENT;

  row.addSpacer();

  const right = row.addStack(); right.layoutVertically();
  const av = right.addText("Ø " + avg);
  av.font = Font.boldSystemFont(20); av.textColor = WHITE; av.rightAlignText();
  const avL = right.addText("Tore / Spiel");
  avL.font = Font.systemFont(10); avL.textColor = ACCENT; avL.rightAlignText();
  right.addSpacer(6);
  const gm = right.addText(fx.played + " Spiele");
  gm.font = Font.systemFont(11); gm.textColor = ACCENT; gm.rightAlignText();

  w.addSpacer(10);

  // Torschützenkönig
  const kingTxt = top
    ? "👑 " + top.name + " · " + top.goals + " Tore"
    : "👑 noch kein Torschützenkönig";
  const king = w.addText(kingTxt);
  king.font = Font.mediumSystemFont(12); king.textColor = WHITE; king.lineLimit = 1;

  if (top) {
    const t = w.addText(top.team);
    t.font = Font.systemFont(10); t.textColor = ACCENT;
  }
  return w;
}

module.exports = { buildWidget };
