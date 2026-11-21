export function filterMatches(matches){
 const unique=new Map();
 for(const m of matches) if(m && ['pre','in'].includes(m.state)) unique.set(m.id,m);
 return [...unique.values()].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)||a.id.localeCompare(b.id));
}
const text=v=>typeof v==='string'&&v.trim()?v:null;
function score(v){if(v===null||v===undefined||v==='')return null;const n=Number(typeof v==='object'?(v.value??v.displayValue):v);return Number.isFinite(n)?n:null;}
function team(c){const t=c?.team; if(!t?.displayName&&!t?.name)throw new Error('Missing ESPN team name');return {name:t.displayName??t.name,abbreviation:text(t.abbreviation),logo:text(t.logo)??text(t.logos?.[0]?.href)};}
export function normalizeEvent(event,league){
 const c=event.competitions?.[0],s=c?.status?.type?.state;
 if(!['pre','in','post'].includes(s))throw new Error(`Unknown ESPN state for ${event.id}`);
 if(s==='post') return null;
 const home=c.competitors?.find(x=>x.homeAway==='home'),away=c.competitors?.find(x=>x.homeAway==='away');
 if(!event.id||!home||!away||!Number.isFinite(Date.parse(event.date)))throw new Error('Incomplete ESPN event');
 const broadcasts=(c.broadcasts??[]).flatMap(b=>b.names??[]).filter(v=>typeof v==='string');
 return {id:String(event.id),league_id:league.slug,league_name:league.name,date:event.date,name:text(event.name),status:s,state:s,
 minute:s==='in'?text(c.status.displayClock):null,home_team:team(home),away_team:team(away),
 home_score:s==='pre'?null:score(home.score),away_score:s==='pre'?null:score(away.score),venue:text(c.venue?.fullName),broadcast:broadcasts.length?[...new Set(broadcasts)].join(', '):null};
}
