// ============================================================
//  WM GOAL COUNTER — Widget-Logik (GitHub, frei editierbar)
//  Datenquelle: football-data.org (v4). Token kommt vom Loader.
// ============================================================

// ----- KONFIG -----
const TARGET    = 253;     // Ziel: Gesamttore
const DEMO_LIVE = false;   // true: nächstes Spiel als LIVE darstellen (testet Live-Anzeige)

// ----- Maße / Farben -----
const BAR_W = 134, CARD_W = 134, FOOT_W = 150;
const WHITE  = Color.white();
const ACCENT = new Color("#a7d7c5");
const DIM    = new Color("#7fb8a3");
const FILL   = new Color("#34d39a");
const TRACK  = new Color("#ffffff", 0.16);
const RED    = new Color("#ff5a5f");

// ----- Länder: Name -> Flagge (Kürzel liefert die API) -----
const FLAG = {
  "Germany":"🇩🇪","Japan":"🇯🇵","Spain":"🇪🇸","Costa Rica":"🇨🇷","Belgium":"🇧🇪","Canada":"🇨🇦",
  "Morocco":"🇲🇦","Croatia":"🇭🇷","Brazil":"🇧🇷","Serbia":"🇷🇸","Switzerland":"🇨🇭","Cameroon":"🇨🇲",
  "Portugal":"🇵🇹","Ghana":"🇬🇭","Uruguay":"🇺🇾","South Korea":"🇰🇷","Korea Republic":"🇰🇷",
  "Qatar":"🇶🇦","Ecuador":"🇪🇨","Senegal":"🇸🇳","Netherlands":"🇳🇱","England":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Iran":"🇮🇷",
  "USA":"🇺🇸","United States":"🇺🇸","Wales":"🏴󠁧󠁢󠁷󠁬󠁳󠁿","Scotland":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","Argentina":"🇦🇷",
  "Saudi Arabia":"🇸🇦","Mexico":"🇲🇽","Poland":"🇵🇱","France":"🇫🇷","Australia":"🇦🇺","Denmark":"🇩🇰",
  "Tunisia":"🇹🇳","Italy":"🇮🇹","Norway":"🇳🇴","Colombia":"🇨🇴","Egypt":"🇪🇬","Nigeria":"🇳🇬",
  "Algeria":"🇩🇿","Chile":"🇨🇱","Peru":"🇵🇪","Sweden":"🇸🇪","Austria":"🇦🇹","Ukraine":"🇺🇦",
  "Turkey":"🇹🇷","Ivory Coast":"🇨🇮","Paraguay":"🇵🇾","New Zealand":"🇳🇿","Jordan":"🇯🇴",
  "Uzbekistan":"🇺🇿","South Africa":"🇿🇦","Panama":"🇵🇦","Honduras":"🇭🇳","Cape Verde":"🇨🇻",
  "Curacao":"🇨🇼","Haiti":"🇭🇹","Jamaica":"🇯🇲","Venezuela":"🇻🇪","Bolivia":"🇧🇴",
  "Czech Republic":"🇨🇿","Czechia":"🇨🇿","Greece":"🇬🇷","Romania":"🇷🇴","Hungary":"🇭🇺",
  "Slovakia":"🇸🇰","Slovenia":"🇸🇮","Iraq":"🇮🇶","United Arab Emirates":"🇦🇪","Oman":"🇴🇲"
};
function teamFlag(n){ return FLAG[n] || "🏳️"; }
function teamCode(tla,name){ return tla || (name||"").slice(0,3).toUpperCase(); }

// ----- Runde -> deutsches Label -----
function roundLabel(c){
  switch(c.stage){
    case "GROUP_STAGE":    return c.group ? "Gruppe "+c.group.replace("GROUP_","") : "Gruppenphase";
    case "LAST_32":        return "Sechzehntelfinale";
    case "LAST_16":        return "Achtelfinale";
    case "QUARTER_FINALS": return "Viertelfinale";
    case "SEMI_FINALS":    return "Halbfinale";
    case "THIRD_PLACE":    return "Spiel um Platz 3";
    case "FINAL":          return "Finale";
    default: return c.stage ? c.stage.replace(/_/g," ") : "";
  }
}

// ----- API (football-data.org v4) -----
async function apiGet(path, token){
  const req = new Request("https://api.football-data.org/v4" + path);
  req.headers = { "X-Auth-Token": token };
  req.timeoutInterval = 15;
  return await req.loadJSON();
}

async function loadData(token){
  const res = await apiGet("/competitions/WC/matches", token);
  const list = res.matches || [];
  let goals = 0, played = 0;
  for (const m of list){
    const h = m.score.fullTime.home, a = m.score.fullTime.away;
    if (h!==null && a!==null){
      goals += h + a;                                  // zählt auch Live-Tore
      if (m.status==="FINISHED" || m.status==="AWARDED") played++;
    }
  }
  return { goals, played, matches: list };
}

async function loadKing(token){
  try{
    const res = await apiGet("/competitions/WC/scorers", token);
    const t = res.scorers && res.scorers[0];
    if (!t) return null;
    return { name:t.player.name, goals:t.goals, country:t.player.nationality };
  }catch(e){ return null; }
}

// ----- Spiel-Karten -----
function toCard(m){
  const st = m.status;
  return {
    id:m.id, status:st, live:(st==="IN_PLAY"||st==="PAUSED"),
    ts:m.utcDate, stage:m.stage, group:m.group,
    home:m.homeTeam.name, away:m.awayTeam.name,
    homeTla:m.homeTeam.tla, awayTla:m.awayTeam.tla,
    hg:m.score.fullTime.home, ag:m.score.fullTime.away
  };
}
function pickCards(matches){
  const isGER = m => m.homeTeam.name==="Germany" || m.awayTeam.name==="Germany"
                  || m.homeTeam.tla==="GER" || m.awayTeam.tla==="GER";
  const isLive = m => m.status==="IN_PLAY" || m.status==="PAUSED";
  const isUp   = m => m.status==="TIMED" || m.status==="SCHEDULED";
  const byDate = (a,b) => new Date(a.utcDate) - new Date(b.utcDate);

  const live = matches.filter(isLive).sort(byDate);
  const up   = matches.filter(isUp).sort(byDate);

  const deM = live.find(isGER) || up.find(isGER) || null;
  const other = m => !deM || m.id!==deM.id;
  const wmM = live.find(other) || up.find(other) || null;

  const cards = [];
  if (deM) cards.push(toCard(deM));
  if (wmM && (!deM || wmM.id!==deM.id)) cards.push(toCard(wmM));
  return cards;
}

// ----- Zeit / Live-Label -----
function fmtKickoff(iso){
  const df = new DateFormatter(); df.locale="de_DE"; df.dateFormat="EEE dd.MM · HH:mm";
  return df.string(new Date(iso));
}
function liveLabel(c){ return c.status==="PAUSED" ? "🔴 Pause" : "🔴 LIVE"; }

// ----- Render-Helfer -----
function txt(p,s,size,color,w){
  const t=p.addText(s);
  t.font = w==="bold"?Font.boldSystemFont(size):w==="semi"?Font.semiboldSystemFont(size)
         : w==="med"?Font.mediumSystemFont(size):Font.systemFont(size);
  t.textColor=color; return t;
}
function addBar(parent, width, frac){
  const h=7, r=h/2;
  const ctx=new DrawContext(); ctx.size=new Size(width,h); ctx.opaque=false; ctx.respectScreenScale=true;
  const track=new Path(); track.addRoundedRect(new Rect(0,0,width,h),r,r);
  ctx.addPath(track); ctx.setFillColor(TRACK); ctx.fillPath();
  const fw=Math.max(h,Math.round(width*Math.max(0,Math.min(1,frac))));
  const fill=new Path(); fill.addRoundedRect(new Rect(0,0,fw,h),r,r);
  ctx.addPath(fill); ctx.setFillColor(FILL); ctx.fillPath();
  const img=parent.addImage(ctx.getImage()); img.imageSize=new Size(width,h);
}
function addMatchCard(parent, c){
  const card=parent.addStack(); card.layoutVertically(); card.size=new Size(CARD_W,46);
  card.cornerRadius=12; card.setPadding(8,10,8,10);
  if (c.live){ card.backgroundColor=new Color("#ff5a5f",0.14); card.borderWidth=1; card.borderColor=new Color("#ff5a5f",0.55); }
  else { card.backgroundColor=new Color("#ffffff",0.07); }

  if (c.live) txt(card, liveLabel(c), 10.5, RED, "bold");
  else        txt(card, fmtKickoff(c.ts), 11, ACCENT, "semi");

  const teams = c.live
    ? `${teamFlag(c.home)} ${teamCode(c.homeTla,c.home)} ${c.hg||0}–${c.ag||0} ${teamCode(c.awayTla,c.away)} ${teamFlag(c.away)}`
    : `${teamFlag(c.home)} ${teamCode(c.homeTla,c.home)} – ${teamCode(c.awayTla,c.away)} ${teamFlag(c.away)}`;
  const tt=txt(card, teams, 13, WHITE, "bold"); tt.lineLimit=1; tt.minimumScaleFactor=0.6;
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
  txt(w,"WM 2026",13,WHITE,"med"); w.addSpacer(4);
  txt(w,String(d.goals),46,WHITE,"bold");
  txt(w,"Tore insgesamt",12,ACCENT,null); w.addSpacer(6);
  txt(w,d.played+" Spiele gespielt",11,ACCENT,null);
  return w;
}
async function buildMedium(cfg){
  const [d,king]=await Promise.all([loadData(cfg.apiKey),loadKing(cfg.apiKey)]);
  const cards=pickCards(d.matches);
  if (DEMO_LIVE && cards[0]){ cards[0].live=true; cards[0].status="IN_PLAY"; cards[0].hg=1; cards[0].ag=0; }
  const oneCard=cards.length<=1;
  const rest=TARGET-d.goals;
  const frac=Math.max(0,Math.min(1,d.goals/TARGET));

  const w=baseWidget();
  if (!oneCard) w.addSpacer();
  const body=w.addStack(); body.layoutHorizontally();

  // linke Spalte
  const left=body.addStack(); left.layoutVertically();
  txt(left,"WM 2026 · TORE",10,ACCENT,"semi");
  txt(left,String(d.goals),48,WHITE,"bold");
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

  // rechte Spalte — Runde über der jeweiligen Kachel
  const right=body.addStack(); right.layoutVertically();
  if (cards.length===0){ txt(right,"Keine kommenden",11,ACCENT,"semi"); txt(right,"Spiele",11,ACCENT,"semi"); }
  for (let i=0;i<cards.length;i++){
    if (i>0) right.addSpacer(6);
    const rl=roundLabel(cards[i]);
    if (rl){ const rh=txt(right, rl.toUpperCase(),8.5,ACCENT,"semi"); rh.lineLimit=1; rh.minimumScaleFactor=0.7; }
    right.addSpacer(2);
    addMatchCard(right,cards[i]);
  }

  if (!oneCard) w.addSpacer();
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
