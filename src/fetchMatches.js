import {fetchScoreboard} from './espn.js';
import {normalizeEvent,filterMatches} from './filterMatches.js';
const day=d=>d.toISOString().slice(0,10).replaceAll('-','');
export function dateQueries(previous,now=new Date(),horizon=7){
 const start=new Date(now);start.setUTCDate(start.getUTCDate()-1);
 const end=new Date(now);end.setUTCDate(end.getUTCDate()+horizon);
 const from=day(start),to=day(end),extra=new Set();
 const dates=[];for(const d=new Date(start);d<=end;d.setUTCDate(d.getUTCDate()+1))dates.push(day(d));
 for(const m of previous?.matches??[]){const date=day(new Date(m.date));if(date<from||date>to)extra.add(date);}
 return [...dates,...[...extra].sort()];
}
export async function fetchMatches(id,previous,{now=new Date(),fetcher=fetchScoreboard}={}){
 const bodies=[];
 for(const dates of dateQueries(previous,now))bodies.push(await fetcher(id,dates));
 const league=bodies[0].leagues.find(l=>l.slug===id);
 const observed=new Set();const matches=[];
 for(const body of bodies)for(const event of body.events){observed.add(String(event.id));const match=normalizeEvent(event,league);if(match)matches.push(match);}
 // A missing previously tracked event is not proof it finished. Preserve the entire
 // league on this uncertainty instead of silently deleting an upcoming/live event.
 for(const old of previous?.matches??[])if(!observed.has(old.id))throw new Error(`Previously tracked event ${old.id} absent from ESPN; status unverified`);
 return {league, matches:filterMatches(matches)};
}
