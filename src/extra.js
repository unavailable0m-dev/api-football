import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {pool} from './espn.js';
const SITE='https://site.api.espn.com/apis/site/v2/sports/soccer';
const V2='https://site.api.espn.com/apis/v2/sports/soccer';
const WEB='https://site.web.api.espn.com/apis/site/v2/sports/soccer';
async function get(url){
 let err;for(let i=0;i<3;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}catch(e){err=e;await new Promise(r=>setTimeout(r,400*2**i));}}
 throw err;
}
async function save(path,value){const text=JSON.stringify(value);let old;try{old=await readFile(path,'utf8');}catch{}if(old===text)return false;await mkdir(join(path,'..'),{recursive:true});await writeFile(path+'.tmp',text);await rename(path+'.tmp',path);return true;}
async function readJ(path){try{return JSON.parse(await readFile(path,'utf8'));}catch{return null;}}
// Per-league extras: standings, top scorers/assists, teams, news. Each is raw ESPN data.
export async function leagueExtras(id,root,now){
 const dir=join(root,'api'),at=now.toISOString(),out={};
 const jobs={standings:`${V2}/${id}/standings`,scorers:`${WEB}/${id}/statistics`,teams:`${SITE}/${id}/teams`,news:`${SITE}/${id}/news`};
 for(const [kind,url] of Object.entries(jobs)){
  try{const data=await get(url);await save(join(dir,kind,`${id}.json`),{source:'ESPN',league_id:id,fetched_at:at,data});out[kind]='ok';}
  catch(e){out[kind]=`error: ${String(e.message).slice(0,100)}`;}
 }
 return out;
}
// Full raw ESPN match summary (boxscore, team stats, lineups, key events, commentary, odds, form, head to head, standings, leaders...)
// stored with the raw scoreboard event. Live, recent and soon matches refresh each run; far-future matches every 6 hours.
export async function matchDetails(matches,raws,root,now){
 const dir=join(root,'api','matches'),at=now.toISOString(),res={ok:0,skipped:0,failed:0};
 await pool(matches,4,async m=>{
  const file=join(dir,`${m.id}.json`),old=await readJ(file);
  const hours=(Date.parse(m.date)-now)/36e5;
  const hot=m.state==='in'||m.state==='post'||hours<72;
  const fresh=old&&now-Date.parse(old.fetched_at)<(hot?(m.state==='post'&&old.state==='post'?3*36e5:0):6*36e5);
  if(fresh){res.skipped++;return;}
  try{
   const summary=await get(`${SITE}/${m.league_id}/summary?event=${m.id}`);
   await save(file,{source:'ESPN',fetched_at:at,id:m.id,league_id:m.league_id,state:m.state,match:m,scoreboard_event:raws.get(m.id)??null,summary});res.ok++;
  }catch(e){res.failed++;console.error(`match ${m.id}: ${e.message}`);}
 });
 return res;
}
export async function enrichAll({root,now,leagues,ids}){
 const extras={};
 await pool(ids,3,async id=>{extras[id]=await leagueExtras(id,root,now);});
 const sel=[],raws=new Map();
 for(const l of leagues){for(const m of [...l.matches,...(l.results??[]).slice(0,8)])sel.push(m);for(const [k,v] of l.raw??[])raws.set(k,v);}
 const details=await matchDetails(sel,raws,root,now);
 return {extras,details};
}
