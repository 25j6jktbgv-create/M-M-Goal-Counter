// ============================================================
//  WM GOAL COUNTER — Widget-Logik (GitHub, frei editierbar)
//  Daten: football-data.org (Spielplan/Endstände/Torschützen)
//         + TheSportsDB (Stadt + LIVE-Scores während der Spiele)
//  Token (football-data) kommt vom Loader.
// ============================================================

// ----- KONFIG -----
const TARGET    = 253;     // Ziel: Gesamttore (ohne Elfmeterschießen)
const DEMO_LIVE = false;   // true: nächstes Spiel als LIVE darstellen (Test)
const TSDB_KEY  = "123";   // TheSportsDB öffentlicher Test-Key
const TSDB_LEAGUE = 4429;  // FIFA World Cup
const TSDB_SEASON = "2026";

// ----- Maße / Farben -----
const BAR_W = 134, CARD_W = 134, FOOT_W = 150;
const WHITE  = Color.white();
const ACCENT = new Color("#a7d7c5");
const DIM    = new Color("#7fb8a3");
const FILL   = new Color("#34d39a");
const TRACK  = new Color("#ffffff", 0.16);
const RED    = new Color("#ff5a5f");

// TheSportsDB-Status, die "läuft gerade" bedeuten
const TSDB_LIVE = ["1H","2H","HT","ET","BT","P","LIVE"];

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
  "Curacao":"🇨🇼","Curaçao":"🇨🇼","Haiti":"🇭🇹","Jamaica":"🇯🇲","Venezuela":"🇻🇪","Bolivia":"🇧🇴",
  "Czech Republic":"🇨🇿","Czechia":"🇨🇿","Greece":"🇬🇷","Romania":"🇷🇴","Hungary":"🇭🇺",
  "Slovakia":"🇸🇰","Slovenia":"🇸🇮","Iraq":"🇮🇶","United Arab Emirates":"🇦🇪","Oman":"🇴🇲",
  "Bosnia-Herzegovina":"🇧🇦","Bosnia and Herzegovina":"🇧🇦"
};
function teamFlag(n){ return FLAG[n] || "🏳️"; }
function teamCode(tla,name){ return tla || (name||"").slice(0,3).toUpperCase(); }

// ----- Stadion -> [Stadt, Länderflagge] (Substring-Match) -----
const VENUE_CITY = [
  ["Azteca","Mexico-Stadt","🇲🇽"],["Akron","Guadalajara","🇲🇽"],["BBVA","Monterrey","🇲🇽"],
  ["MetLife","New York","🇺🇸"],["AT&T","Dallas","🇺🇸"],["SoFi","Los Angeles","🇺🇸"],
  ["Levi","San Francisco","🇺🇸"],["Lumen","Seattle","🇺🇸"],["Mercedes","Atlanta","🇺🇸"],
  ["Hard Rock","Miami","🇺🇸"],["NRG","Houston","🇺🇸"],["Reliant","Houston","🇺🇸"],
  ["Arrowhead","Kansas City","🇺🇸"],["Lincoln Financial","Philadelphia","🇺🇸"],
  ["Gillette","Boston","🇺🇸"],["BMO","Toronto","🇨🇦"],["BC Place","Vancouver","🇨🇦"]
];
function venueToCity(v){
  if (!v) return null;
  const lv = v.toLowerCase();
  for (const e of VENUE_CITY){ if (lv.indexOf(e[0].toLowerCase())>=0) return {city:e[1], flag:e[2]}; }
  return null;
}

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

// ----- APIs -----
async function fdGet(path, token){
  const req = new Request("https://api.football-data.org/v4" + path);
  req.headers = { "X-Auth-Token": token };
  req.timeoutInterval = 15;
  return await req.loadJSON();
}
async function loadFd(token){
  const fm = FileManager.local();
  const p = fm.joinPath(fm.documentsDirectory(), "wm-fd-cache.json");
  try{
    const res = await fdGet("/competitions/WC/matches", token);
    if (res.matches && res.matches.length){
      fm.writeString(p, JSON.stringify(res.matches));   // letzte gute Antwort merken
      return res.matches;
    }
    throw new Error("leere Antwort (Rate-Limit?)");
  }catch(e){
    if (fm.fileExists(p)) return JSON.parse(fm.readString(p));  // Fallback: Cache
    return [];
  }
}
async function loadKing(token){
  const fm = FileManager.local();
  const p = fm.joinPath(fm.documentsDirectory(), "wm-king-cache.json");
  try{
    const res = await fdGet("/competitions/WC/scorers", token);
    const t = res.scorers && res.scorers[0];
    if (!t) throw new Error("kein Scorer");
    const country = (t.team && t.team.name) || t.player.nationality;
    const king = { name:t.player.name, goals:t.goals, country };
    fm.writeString(p, JSON.stringify(king));
    return king;
  }catch(e){
    if (fm.fileExists(p)) return JSON.parse(fm.readString(p));
    return null;
  }
}
async function loadTsdb(){
  try{
    const req = new Request(`https://www.thesportsdb.com/api/v1/json/${TSDB_KEY}/eventsseason.php?id=${TSDB_LEAGUE}&s=${TSDB_SEASON}`);
    req.timeoutInterval = 12;
    const res = await req.loadJSON();
    const byDate = {};
    for (const e of (res.events||[])){ const d=e.dateEvent||""; (byDate[d]=byDate[d]||[]).push(e); }
    return byDate;
  }catch(e){ return {}; }
}

// ----- Matching football-data <-> TheSportsDB -----
function norm(s){ return (s||"").toLowerCase().replace(/[^a-z]/g,""); }
function findTsdb(home, away, dateIso, byDate){
  const list = byDate[(dateIso||"").slice(0,10)];
  if (!list) return null;
  const h=norm(home), a=norm(away);
  return list.find(e=>norm(e.strHomeTeam)===h)
      || list.find(e=>norm(e.strAwayTeam)===a)
      || (list.length===1 ? list[0] : null);
}
function tsdbIsLive(ev){ return !!ev && TSDB_LIVE.includes((ev.strStatus||"").toUpperCase()); }

// ----- Tore zählen: football-data + Live-Ergänzung aus TheSportsDB -----
function countGoals(fdMatches, byDate){
  let goals=0, played=0;
  for (const m of fdMatches){
    const h=m.score.fullTime.home, a=m.score.fullTime.away;
    if (h!==null && a!==null){
      goals += h+a;
      if (m.status==="FINISHED" || m.status==="AWARDED") played++;
    } else {
      // football-data hat (noch) nichts -> läuft das Spiel laut TheSportsDB?
      const ev = findTsdb(m.homeTeam.name, m.awayTeam.name, m.utcDate, byDate);
      if (tsdbIsLive(ev)){
        goals += (parseInt(ev.intHomeScore)||0) + (parseInt(ev.intAwayScore)||0);
      }
    }
  }
  return { goals, played };
}

// ----- Spiel-Karten -----
function toCard(m){
  const st=m.status;
  return {
    id:m.id, status:st, live:(st==="IN_PLAY"||st==="PAUSED"),
    ts:m.utcDate, stage:m.stage, group:m.group,
    home:m.homeTeam.name, away:m.awayTeam.name,
    homeTla:m.homeTeam.tla, awayTla:m.awayTeam.tla,
    hg:m.score.fullTime.home, ag:m.score.fullTime.away, minute:null
  };
}
function pickCards(matches, byDate){
  const isGER = m => m.homeTeam.name==="Germany" || m.awayTeam.name==="Germany"
                  || m.homeTeam.tla==="GER" || m.awayTeam.tla==="GER";
  const fdLive = m => m.status==="IN_PLAY" || m.status==="PAUSED";
  // "läuft" = football-data sagt live ODER TheSportsDB sagt live (fd hängt hinterher)
  const isLive = m => fdLive(m) || (m.status==="TIMED" &&
                    tsdbIsLive(findTsdb(m.homeTeam.name, m.awayTeam.name, m.utcDate, byDate)));
  const isUp   = m => (m.status==="TIMED" || m.status==="SCHEDULED") && !isLive(m);
  const byTs   = (a,b) => new Date(a.utcDate) - new Date(b.utcDate);

  const live = matches.filter(isLive).sort(byTs);
  const up   = matches.filter(isUp).sort(byTs);
  const deM  = live.find(isGER) || up.find(isGER) || null;
  const other = m => !deM || m.id!==deM.id;
  const wmM  = live.find(other) || up.find(other) || null;

  const cards=[];
  if (deM) cards.push(toCard(deM));
  if (wmM && (!deM || wmM.id!==deM.id)) cards.push(toCard(wmM));

  // Live-Daten aus TheSportsDB anreichern (Score, Status, ggf. Minute) + Stadt
  for (const c of cards){
    const ev = findTsdb(c.home, c.away, c.ts, byDate);
    if (tsdbIsLive(ev)){
      c.live = true;
      c.tsdbStatus = (ev.strStatus||"").toUpperCase();
      if (c.hg===null || c.hg===undefined) c.hg = parseInt(ev.intHomeScore)||0;
      if (c.ag===null || c.ag===undefined) c.ag = parseInt(ev.intAwayScore)||0;
      const min = parseInt(ev.strProgress);
      if (!isNaN(min)) c.minute = min;
    }
    if (ev){
      const v = venueToCity(ev.strVenue);
      if (v){ c.city=v.city; c.cityFlag=v.flag; }
    }
  }
  return cards;
}

// ----- Zeit / Live -----
function fmtKickoff(iso){
  const df=new DateFormatter(); df.locale="de_DE"; df.dateFormat="EEE dd.MM · HH:mm";
  return df.string(new Date(iso));
}
function liveLabel(c){
  if (c.tsdbStatus==="HT") return "🔴 Halbzeit";
  if (c.tsdbStatus==="P")  return "🔴 Elfmeterschießen";
  if (c.status==="PAUSED") return "🔴 Pause";
  if (c.minute!=null)      return `🔴 LIVE · ${c.minute}'`;
  return "🔴 LIVE";
}

// ----- Render -----
function txt(p,s,size,color,w){
  const t=p.addText(s);
  t.font = w==="bold"?Font.boldSystemFont(size):w==="semi"?Font.semiboldSystemFont(size)
         : w==="med"?Font.mediumSystemFont(size):Font.systemFont(size);
  t.textColor=color; return t;
}
function addBar(parent,width,frac){
  const h=7,r=h/2;
  const ctx=new DrawContext(); ctx.size=new Size(width,h); ctx.opaque=false; ctx.respectScreenScale=true;
  const track=new Path(); track.addRoundedRect(new Rect(0,0,width,h),r,r);
  ctx.addPath(track); ctx.setFillColor(TRACK); ctx.fillPath();
  const fw=Math.max(h,Math.round(width*Math.max(0,Math.min(1,frac))));
  const fill=new Path(); fill.addRoundedRect(new Rect(0,0,fw,h),r,r);
  ctx.addPath(fill); ctx.setFillColor(FILL); ctx.fillPath();
  const img=parent.addImage(ctx.getImage()); img.imageSize=new Size(width,h);
}
function addMatchCard(parent,c){
  const card=parent.addStack(); card.layoutVertically(); card.size=new Size(CARD_W,50);
  card.cornerRadius=12; card.setPadding(7,10,7,10);
  if (c.live){ card.backgroundColor=new Color("#ff5a5f",0.14); card.borderWidth=1; card.borderColor=new Color("#ff5a5f",0.55); }
  else { card.backgroundColor=new Color("#ffffff",0.07); }
  if (c.live) txt(card, liveLabel(c), 10.5, RED, "bold");
  else        txt(card, fmtKickoff(c.ts), 11, ACCENT, "semi");
  const teams = c.live
    ? `${teamFlag(c.home)} ${teamCode(c.homeTla,c.home)} ${c.hg||0}–${c.ag||0} ${teamCode(c.awayTla,c.away)} ${teamFlag(c.away)}`
    : `${teamFlag(c.home)} ${teamCode(c.homeTla,c.home)} – ${teamCode(c.awayTla,c.away)} ${teamFlag(c.away)}`;
  const tt=txt(card, teams, 13, WHITE, "bold"); tt.lineLimit=1; tt.minimumScaleFactor=0.6;
  if (c.city){
    const ct=txt(card, (c.cityFlag?c.cityFlag+" ":"")+c.city, 10, DIM, null); ct.lineLimit=1; ct.minimumScaleFactor=0.7;
  }
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
  const [fd,byDate]=await Promise.all([loadFd(cfg.apiKey),loadTsdb()]);
  const d=countGoals(fd,byDate);
  const w=baseWidget();
  txt(w,"WM 2026",13,WHITE,"med"); w.addSpacer(4);
  txt(w,String(d.goals),46,WHITE,"bold");
  txt(w,"Tore insgesamt",12,ACCENT,null); w.addSpacer(6);
  txt(w,d.played+" Spiele gespielt",11,ACCENT,null);
  return w;
}
async function buildMedium(cfg){
  const [fd,king,byDate]=await Promise.all([loadFd(cfg.apiKey),loadKing(cfg.apiKey),loadTsdb()]);
  const d=countGoals(fd,byDate);
  const cards=pickCards(fd,byDate);
  if (DEMO_LIVE && cards[0]){ cards[0].live=true; cards[0].hg=1; cards[0].ag=0; }
  const oneCard=cards.length<=1;
  const rest=TARGET-d.goals;
  const frac=Math.max(0,Math.min(1,d.goals/TARGET));

  const w=baseWidget();
  if (!oneCard) w.addSpacer();
  const body=w.addStack(); body.layoutHorizontally();

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
