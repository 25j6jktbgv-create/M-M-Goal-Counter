// ============================================================
//  WM GOAL COUNTER — Widget-Logik (GitHub, frei editierbar)
//  KEIN API-Key hier – kommt vom Loader.
// ============================================================

// ----- KONFIG -----
const LEAGUE    = 1;        // 1 = FIFA World Cup
const SEASON    = 2022;     // <<< auf 2026 ändern, sobald die Quelle dafür steht
const TARGET    = 253;      // Ziel: Gesamttore (ohne Elfmeterschießen)
const GER_ID    = 25;       // api-football Team-ID Deutschland
const DEMO_MODE = true;     // Mock-Spiele zeigen, solange keine echten kommenden Spiele da sind
const DEMO_ONE  = false;    // nur EIN Demo-Spiel (testet den Voll-Breite-Balken)
const DEMO_LIVE = false;    // Demo-Spiel als LIVE darstellen (testet Live-Anzeige)

// ----- Maße / Farben -----
const BAR_W = 134, CARD_W = 134, FOOT_W = 150;
const WHITE  = Color.white();
const ACCENT = new Color("#a7d7c5");
const DIM    = new Color("#7fb8a3");
const FILL   = new Color("#34d39a");
const TRACK  = new Color("#ffffff", 0.16);
const RED    = new Color("#ff5a5f");

const LIVE_SET = ["1H","2H","HT","ET","BT","P","LIVE","SUSP","INT"];

// ----- Länder: Name -> [Flagge, Kürzel] (erweiterbar) -----
const COUNTRY = {
  "Germany":["🇩🇪","GER"],"Japan":["🇯🇵","JPN"],"Spain":["🇪🇸","ESP"],"Costa Rica":["🇨🇷","CRC"],
  "Belgium":["🇧🇪","BEL"],"Canada":["🇨🇦","CAN"],"Morocco":["🇲🇦","MAR"],"Croatia":["🇭🇷","CRO"],
  "Brazil":["🇧🇷","BRA"],"Serbia":["🇷🇸","SRB"],"Switzerland":["🇨🇭","SUI"],"Cameroon":["🇨🇲","CMR"],
  "Portugal":["🇵🇹","POR"],"Ghana":["🇬🇭","GHA"],"Uruguay":["🇺🇾","URU"],"South Korea":["🇰🇷","KOR"],
  "Korea Republic":["🇰🇷","KOR"],"Qatar":["🇶🇦","QAT"],"Ecuador":["🇪🇨","ECU"],"Senegal":["🇸🇳","SEN"],
  "Netherlands":["🇳🇱","NED"],"England":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","ENG"],"Iran":["🇮🇷","IRN"],"USA":["🇺🇸","USA"],
  "United States":["🇺🇸","USA"],"Wales":["🏴󠁧󠁢󠁷󠁬󠁳󠁿","WAL"],"Scotland":["🏴󠁧󠁢󠁳󠁣󠁴󠁿","SCO"],
  "Argentina":["🇦🇷","ARG"],"Saudi Arabia":["🇸🇦","KSA"],"Mexico":["🇲🇽","MEX"],"Poland":["🇵🇱","POL"],
  "France":["🇫🇷","FRA"],"Australia":["🇦🇺","AUS"],"Denmark":["🇩🇰","DEN"],"Tunisia":["🇹🇳","TUN"],
  "Italy":["🇮🇹","ITA"],"Norway":["🇳🇴","NOR"],"Colombia":["🇨🇴","COL"],"Egypt":["🇪🇬","EGY"],
  "Nigeria":["🇳🇬","NGA"],"Algeria":["🇩🇿","ALG"],"Chile":["🇨🇱","CHI"],"Peru":["🇵🇪","PER"],
  "Sweden":["🇸🇪","SWE"],"Austria":["🇦🇹","AUT"],"Ukraine":["🇺🇦","UKR"],"Turkey":["🇹🇷","TUR"],
  "Ivory Coast":["🇨🇮","CIV"],"Paraguay":["🇵🇾","PAR"],"New Zealand":["🇳🇿","NZL"],
  "Jordan":["🇯🇴","JOR"],"Uzbekistan":["🇺🇿","UZB"]
};
function teamFlag(n){ return (COUNTRY[n] && COUNTRY[n][0]) || "🏳️"; }
function teamCode(n){ return (COUNTRY[n] && COUNTRY[n][1]) || (n||"").slice(0,3).toUpperCase(); }

// ----- Stadt -> Länderflagge (erweiterbar) -----
const CITY_FLAG = {
  "Doha":"🇶🇦","Al Khor":"🇶🇦","Al Rayyan":"🇶🇦","Ar-Rayyan":"🇶🇦","Al Wakrah":"🇶🇦","Lusail":"🇶🇦","Al Daayen":"🇶🇦","Education City":"🇶🇦",
  "Atlanta":"🇺🇸","Foxborough":"🇺🇸","Boston":"🇺🇸","Arlington":"🇺🇸","Dallas":"🇺🇸","Houston":"🇺🇸","Kansas City":"🇺🇸","Inglewood":"🇺🇸","Los Angeles":"🇺🇸","Miami Gardens":"🇺🇸","Miami":"🇺🇸","East Rutherford":"🇺🇸","New York":"🇺🇸","Philadelphia":"🇺🇸","Santa Clara":"🇺🇸","San Francisco":"🇺🇸","Seattle":"🇺🇸",
  "Toronto":"🇨🇦","Vancouver":"🇨🇦",
  "Mexico City":"🇲🇽","Mexico-Stadt":"🇲🇽","Guadalajara":"🇲🇽","Monterrey":"🇲🇽"
};
function cityFlag(c){ if (CITY_FLAG[c]) return CITY_FLAG[c]; if (SEASON===2022) return "🇶🇦"; return ""; }

// ----- Runde -> deutsches Label -----
function roundLabel(r){
  if (!r) return "";
  const s = r.toLowerCase();
  if (s.indexOf("group")===0)    return "Gruppenphase";
  if (s.includes("round of 32")) return "Sechzehntelfinale";
  if (s.includes("round of 16")) return "Achtelfinale";
  if (s.includes("quarter"))     return "Viertelfinale";
  if (s.includes("semi"))        return "Halbfinale";
  if (s.includes("3rd place") || s.includes("third place")) return "Spiel um Platz 3";
  if (s.includes("final"))       return "Finale";
  return r;
}

// ----- API -----
async function apiGet(path, apiKey){
  const req = new Request("https://v3.football.api-sports.io" + path);
  req.headers = { "x-apisports-key": apiKey };
  req.timeoutInterval = 15;
  return await req.loadJSON();
}

async function loadData(apiKey){
  const res = await apiGet(`/fixtures?league=${LEAGUE}&season=${SEASON}`, apiKey);
  const list = res.response || [];
  let goals=0, pen=0, played=0;
  for (const f of list){
    const st = f.fixture.status.short;
    const gh = f.goals.home, ga = f.goals.away;
    if (gh!==null && ga!==null){
      goals += gh+ga;                                  // zählt auch Live-Tore
      if (["FT","AET","PEN"].includes(st)) played++;
      if (st==="PEN" && f.score && f.score.penalty){
        pen += (f.score.penalty.home||0) + (f.score.penalty.away||0);
      }
    }
  }
  return { goals, withPen: goals+pen, penGoals: pen, played, fixtures: list };
}

async function loadKing(apiKey){
  try{
    const res = await apiGet(`/players/topscorers?league=${LEAGUE}&season=${SEASON}`, apiKey);
    const t = res.response && res.response[0];
    if (!t) return null;
    return { name:t.player.name, goals:t.statistics[0].goals.total, country:t.statistics[0].team.name };
  }catch(e){ return null; }
}

// ----- Spiel-Karten -----
function toCard(f){
  const st = f.fixture.status.short;
  return {
    id:f.fixture.id, status:st, live:LIVE_SET.includes(st),
    ts:f.fixture.timestamp, home:f.teams.home.name, away:f.teams.away.name,
    city:(f.fixture.venue && f.fixture.venue.city) || "",
    round:f.league.round || "",
    hg:f.goals.home, ag:f.goals.away, minute:f.fixture.status.elapsed
  };
}
function mockCards(){
  const t1 = Math.floor(new Date("2026-06-16T19:00:00Z").getTime()/1000); // 21:00 dt. Zeit
  const t2 = Math.floor(new Date("2026-06-11T01:00:00Z").getTime()/1000); // 03:00 dt. Zeit
  const de = { id:-1, status:"NS", live:false, ts:t1, home:"Germany", away:"Japan",
               city:"Dallas", round:"Round of 16", hg:null, ag:null, minute:null };
  const wm = { id:-2, status:"NS", live:false, ts:t2, home:"Mexico", away:"Ecuador",
               city:"Mexico-Stadt", round:"Group A - 1", hg:null, ag:null, minute:null };
  if (DEMO_LIVE){ de.live=true; de.status="2H"; de.hg=1; de.ag=0; de.minute=67; }
  return DEMO_ONE ? [wm] : [de, wm];
}
function pickCards(list){
  const isGER = f => f.teams.home.id===GER_ID || f.teams.away.id===GER_ID
                  || f.teams.home.name==="Germany" || f.teams.away.name==="Germany";
  const live = list.filter(f => LIVE_SET.includes(f.fixture.status.short))
                   .sort((a,b)=>a.fixture.timestamp-b.fixture.timestamp);
  const ns   = list.filter(f => f.fixture.status.short==="NS")
                   .sort((a,b)=>a.fixture.timestamp-b.fixture.timestamp);

  const deF = live.find(isGER) || ns.find(isGER) || null;
  const other = f => !deF || f.fixture.id!==deF.fixture.id;
  const wmF = live.find(other) || ns.find(other) || null;

  const cards=[];
  if (deF) cards.push(toCard(deF));
  if (wmF && (!deF || wmF.fixture.id!==deF.fixture.id)) cards.push(toCard(wmF));
  if (cards.length===0 && DEMO_MODE) return mockCards();
  return cards;
}

// ----- Zeit / Live-Label -----
function fmtKickoff(ts){
  const df = new DateFormatter(); df.locale="de_DE"; df.dateFormat="EEE dd.MM · HH:mm";
  return df.string(new Date(ts*1000));
}
function liveLabel(c){
  if (c.status==="HT") return "🔴 Halbzeit";
  if (c.status==="P")  return "🔴 Elfmeterschießen";
  if (c.minute!=null)  return `🔴 LIVE · ${c.minute}'`;
  return "🔴 LIVE";
}

// ----- Render-Helfer -----
function txt(p,s,size,color,w){
  const t=p.addText(s);
  t.font = w==="bold"?Font.boldSystemFont(size):w==="semi"?Font.semiboldSystemFont(size)
         : w==="med"?Font.mediumSystemFont(size):Font.systemFont(size);
  t.textColor=color; return t;
}
function addBar(parent, width, frac){
  const h = 7, r = h/2;
  const ctx = new DrawContext();
  ctx.size = new Size(width, h); ctx.opaque = false; ctx.respectScreenScale = true;
  const track = new Path(); track.addRoundedRect(new Rect(0,0,width,h), r, r);
  ctx.addPath(track); ctx.setFillColor(TRACK); ctx.fillPath();
  const fw = Math.max(h, Math.round(width * Math.max(0, Math.min(1, frac))));
  const fill = new Path(); fill.addRoundedRect(new Rect(0,0,fw,h), r, r);
  ctx.addPath(fill); ctx.setFillColor(FILL); ctx.fillPath();
  const img = parent.addImage(ctx.getImage()); img.imageSize = new Size(width, h);
}
function addMatchCard(parent, c){
  const card=parent.addStack(); card.layoutVertically(); card.size=new Size(CARD_W,50);
  card.cornerRadius=12; card.setPadding(7,10,7,10);
  if (c.live){
    card.backgroundColor=new Color("#ff5a5f",0.14);
    card.borderWidth=1; card.borderColor=new Color("#ff5a5f",0.55);
  } else {
    card.backgroundColor=new Color("#ffffff",0.07);
  }

  // Zeile 1: Zeit oder Live
  if (c.live) txt(card, liveLabel(c), 10.5, RED, "bold");
  else        txt(card, fmtKickoff(c.ts), 11, ACCENT, "semi");

  // Zeile 2: Teams (mit Stand wenn live)
  const teams = c.live
    ? `${teamFlag(c.home)} ${teamCode(c.home)} ${c.hg||0}–${c.ag||0} ${teamCode(c.away)} ${teamFlag(c.away)}`
    : `${teamFlag(c.home)} ${teamCode(c.home)} – ${teamCode(c.away)} ${teamFlag(c.away)}`;
  const tt=txt(card, teams, 13, WHITE, "bold"); tt.lineLimit=1; tt.minimumScaleFactor=0.6;

  // Zeile 3: nur Stadt (Runde steht über der Kachel)
  const cf=cityFlag(c.city);
  const ct=txt(card, (cf?cf+" ":"")+c.city, 10, DIM, null); ct.lineLimit=1; ct.minimumScaleFactor=0.7;
}

// ----- Widget -----
function baseWidget(){
  const w=new ListWidget();
  const g=new LinearGradient(); g.colors=[new Color("#0f5a41"),new Color("#0b3d2e")];
  g.locations=[0,1]; g.startPoint=new Point(0,0); g.endPoint=new Point(1,1);
  w.backgroundGradient=g; w.setPadding(14,16,14,16);
  return w;
}
async function buildWidget(cfg){
  return (cfg.family||"medium")==="small" ? buildSmall(cfg) : buildMedium(cfg);
}
async function buildSmall(cfg){
  const d=await loadData(cfg.apiKey);
  const w=baseWidget();
  txt(w,"WM "+SEASON,13,WHITE,"med"); w.addSpacer(4);
  txt(w,String(d.goals),46,WHITE,"bold");
  txt(w,"Tore (o. Elfm.schießen)",11,ACCENT,null); w.addSpacer(6);
  txt(w,d.played+" Spiele gespielt",11,ACCENT,null);
  return w;
}
async function buildMedium(cfg){
  const [d,king]=await Promise.all([loadData(cfg.apiKey),loadKing(cfg.apiKey)]);
  const cards=pickCards(d.fixtures);
  const oneCard=cards.length<=1;
  const rest=TARGET-d.goals;
  const frac=Math.max(0,Math.min(1,d.goals/TARGET));

  const w=baseWidget();
  if (!oneCard) w.addSpacer();

  const body=w.addStack(); body.layoutHorizontally();

  // linke Spalte
  const left=body.addStack(); left.layoutVertically();
  txt(left,("WM "+SEASON+" · Tore").toUpperCase(),10,ACCENT,"semi");
  txt(left,String(d.goals),46,WHITE,"bold");
  txt(left,`mit Elfm.schießen ${d.withPen} · +${d.penGoals}`,10.5,DIM,null);
  if (king){
    const kr=left.addStack(); kr.layoutHorizontally(); kr.centerAlignContent();
    txt(kr,`👑 ${teamFlag(king.country)} `,11.5,ACCENT,null);
    const kn=txt(kr,king.name,11.5,WHITE,"semi"); kn.lineLimit=1; kn.minimumScaleFactor=0.6;
    txt(kr,` · ${king.goals}`,11.5,WHITE,"semi");
  }
  if (!oneCard){
    left.addSpacer(8);
    addBar(left,BAR_W,frac);
    const pl=left.addStack(); pl.layoutHorizontally(); pl.size=new Size(BAR_W,14); pl.centerAlignContent();
    txt(pl,`${d.goals} / ${TARGET}`,10.5,ACCENT,null); pl.addSpacer();
    txt(pl, rest>=0?`noch ${rest}`:`+${-rest} drüber`,10.5,WHITE,"bold");
  }

  body.addSpacer();

  // rechte Spalte — Runde ÜBER der jeweiligen Kachel
  const right=body.addStack(); right.layoutVertically();
  for (let i=0;i<cards.length;i++){
    if (i>0) right.addSpacer(6);
    const rl = roundLabel(cards[i].round);
    if (rl){ const rh=txt(right, rl.toUpperCase(), 8.5, ACCENT, "semi"); rh.lineLimit=1; rh.minimumScaleFactor=0.7; }
    right.addSpacer(2);
    addMatchCard(right, cards[i]);
  }

  if (!oneCard) w.addSpacer();

  // Voll-Breite-Balken (nur bei ≤1 Karte)
  if (oneCard){
    w.addSpacer();
    const foot=w.addStack(); foot.layoutHorizontally(); foot.centerAlignContent();
    txt(foot,"ZIEL "+TARGET,9,ACCENT,"semi"); foot.addSpacer(8);
    addBar(foot,FOOT_W,frac); foot.addSpacer(8);
    txt(foot, rest>=0?`noch ${rest}`:`+${-rest}`,11,WHITE,"bold");
  }
  return w;
}

module.exports = { buildWidget };
