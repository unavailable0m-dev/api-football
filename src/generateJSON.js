import {filterMatches} from './filterMatches.js';
export function leagueJSON(id,name,matches,last_update,results=[]){return {source:'ESPN',stale:false,last_update,total_matches:matches.length,total_results:results.length,total_leagues:1,league_id:id,league_name:name,matches,results};}
export function allJSON(leagues){
 const matches=filterMatches(leagues.flatMap(l=>l.matches));
 const results=leagues.flatMap(l=>l.results??[]).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 const times=leagues.map(l=>l.last_update).filter(Boolean).sort();
 return {source:'ESPN',stale:leagues.some(l=>l.stale),last_update:times.length===leagues.length?times[0]:null,total_matches:matches.length,total_results:results.length,total_leagues:leagues.length,league_id:null,league_name:null,matches,results};
}
