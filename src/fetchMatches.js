import {fetchScoreboard} from './espn.js';
import {normalizeAny,filterMatches,filterResults} from './filterMatches.js';
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
 const raw=new Map(),queried=new Set(),observed=new Set(),found=[];let league;
 const query=async date=>{
   const body=await fetcher(id,date);queried.add(date);
   league??=body.leagues.find(l=>l.slug===id);
   for(const event of body.events){observed.add(String(event.id));const match=normalizeAny(event,league);found.push(match);raw.set(match.id,event);}
 };
 const upcoming=()=>filterMatches(found).filter(m=>m.state==='pre').length;
 for(const date of dateQueries(previous,now))await query(date);
 for(const back of [2,3]){const d=new Date(now);d.setUTCDate(d.getUTCDate()-back);const k=day(d);if(!queried.has(k))await query(k);}
 // ESPN itself publishes the season's scheduled match dates. Search those dates,
 // in order, only when the normal window has fewer than five upcoming matches.
 const limit=new Date(now);limit.setUTCFullYear(limit.getUTCFullYear()+1);
 const validCalendar=Array.isArray(league.calendar)&&league.calendarType==='day'&&league.calendarIsWhitelist===true;
 const calendar=validCalendar?league.calendar.filter(x=>typeof x==='string'&&Number.isFinite(Date.parse(x))).map(x=>day(new Date(x))):[];
 const candidates=validCalendar?[...new Set(calendar)].filter(x=>x>=day(now)&&x<=day(limit)).sort():dateQueries(null,now,90);
 for(const date of candidates){if(upcoming()>=5)break;if(!queried.has(date))await query(date);}
 for(const old of previous?.matches??[])if(!observed.has(old.id))throw new Error(`Previously tracked event ${old.id} absent from ESPN; status unverified`);
 const matches=filterMatches(found),count=matches.filter(m=>m.state==='pre').length;
 const results=filterResults(found).slice(0,40);
 return {league,matches,results,raw,coverage:{minimum_upcoming:5,upcoming_count:count,upcoming_shortfall:Math.max(0,5-count),discovery:validCalendar?'ESPN season calendar':'90-day daily fallback',queried_dates:queried.size,searched_until:[...queried].sort().at(-1),calendar_end:league.calendarEndDate??null}};
}
