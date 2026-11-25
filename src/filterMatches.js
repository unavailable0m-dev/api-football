export function filterMatches(matches){
 const unique=new Map();
 for(const m of matches) if(m && ['pre','in'].includes(m.state)) unique.set(m.id,m);
 return [...unique.values()].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)||a.id.localeCompare(b.id));
}
const text=v=>typeof v==='string'&&v.trim()?v:null;
function score(v){if(v===null||v===undefined||v==='')return null;const n=Number(typeof v==='object'?(v.value??v.displayValue):v);return Number.isFinite(n)?n:null;}
function team(c){const t=c?.team; if(!t?.displayName&&!t?.name)throw new Error('Missing ESPN team name');return {name:t.displayName??t.name,abbreviation:text(t.abbreviation),logo:text(t.logo)??text(t.logos?.[0]?.href)};}
const statMap=l=>Object.fromEntries((l??[]).filter(x=>x?.name).map(x=>[x.name,x.displayValue??x.value??null]));
function extras(event,c,home,away,s){
 const det=(c.details??[]).map(d=>({minute:d.clock?.displayValue??null,type:d.type?.text??null,team_id:d.team?.id??null,scoring:!!d.scoringPlay,yellow_card:!!d.yellowCard,red_card:!!d.redCard,penalty:!!d.penaltyKick,own_goal:!!d.ownGoal,players:(d.athletesInvolved??[]).map(a=>a.displayName).filter(Boolean)}));
 const side=x=>({id:x.team?.id??null,form:text(x.form),records:(x.records??[]).map(r=>({name:r.name??r.type??null,summary:r.summary??null})),stats:statMap(x.statistics),winner:x.winner??null,shootout_score:x.shootoutScore??null});
 const o=c.odds?.[0];
 return {status_detail:text(c.status?.type?.detail),status_description:text(c.status?.type?.description),period:c.status?.period??null,attendance:c.attendance??null,
  home:side(home),away:side(away),events:det,
  odds:o?{provider:o.provider?.name??null,details:o.details??null,over_under:o.overUnder??null,home_moneyline:o.moneyline?.home?.close?.odds??null,away_moneyline:o.moneyline?.away?.close?.odds??null,draw_moneyline:o.drawOdds?.moneyLine??o.moneyline?.draw?.close?.odds??null}:null,
  headline:text(c.headlines?.[0]?.description),notes:(c.notes??[]).map(n=>n.headline).filter(Boolean),
  link:event.links?.find(l=>l.rel?.includes('summary'))?.href??null,season:event.season?.slug??null,
  winner:s==='post'?(home.winner?'home':away.winner?'away':'draw'):null,detail_file:`matches/${event.id}.json`};
}
export function normalizeAny(event,league){
 const c=event.competitions?.[0],s=c?.status?.type?.state;
 if(!['pre','in','post'].includes(s))throw new Error(`Unknown ESPN state for ${event.id}`);
 const home=c.competitors?.find(x=>x.homeAway==='home'),away=c.competitors?.find(x=>x.homeAway==='away');
 if(!event.id||!home||!away||!Number.isFinite(Date.parse(event.date)))throw new Error('Incomplete ESPN event');
 const broadcasts=(c.broadcasts??[]).flatMap(b=>b.names??[]).filter(v=>typeof v==='string');
 return {id:String(event.id),league_id:league.slug,league_name:league.name,date:event.date,name:text(event.name),status:s,state:s,
 minute:s==='in'?text(c.status.displayClock):null,home_team:team(home),away_team:team(away),
 home_score:s==='pre'?null:score(home.score),away_score:s==='pre'?null:score(away.score),venue:text(c.venue?.fullName),broadcast:broadcasts.length?[...new Set(broadcasts)].join(', '):null,...extras(event,c,home,away,s)};
}
export function normalizeEvent(event,league){
 const c=event.competitions?.[0],s=c?.status?.type?.state;
 if(!['pre','in','post'].includes(s))throw new Error(`Unknown ESPN state for ${event.id}`);
 if(s==='post') return null;
 return normalizeAny(event,league);
}
export function normalizeEventLegacy(event,league){
 const c=event.competitions?.[0],s=c?.status?.type?.state;
 const home=c.competitors?.find(x=>x.homeAway==='home'),away=c.competitors?.find(x=>x.homeAway==='away');
 if(!event.id||!home||!away||!Number.isFinite(Date.parse(event.date)))throw new Error('Incomplete ESPN event');
 const broadcasts=(c.broadcasts??[]).flatMap(b=>b.names??[]).filter(v=>typeof v==='string');
 return {id:String(event.id),league_id:league.slug,league_name:league.name,date:event.date,name:text(event.name),status:s,state:s,
 minute:s==='in'?text(c.status.displayClock):null,home_team:team(home),away_team:team(away),
 home_score:s==='pre'?null:score(home.score),away_score:s==='pre'?null:score(away.score),venue:text(c.venue?.fullName),broadcast:broadcasts.length?[...new Set(broadcasts)].join(', '):null};
}
