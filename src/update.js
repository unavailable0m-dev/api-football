import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {LEAGUE_IDS} from './leagues.js';
import {pool} from './espn.js';
import {fetchMatches} from './fetchMatches.js';
import {leagueJSON,allJSON} from './generateJSON.js';
export async function readJSON(path){try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
export async function saveChanged(path,value){const text=JSON.stringify(value,null,2)+'\n';let old;try{old=await readFile(path,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}if(old===text)return false;await mkdir(join(path,'..'),{recursive:true});await writeFile(path+'.tmp',text);await rename(path+'.tmp',path);return true;}
export async function update({root=process.cwd(),now=new Date(),fetcher=fetchMatches}={}){
 const timestamp=now.toISOString(),dir=join(root,'api'),leagues=[],health={last_attempt:timestamp,source:'ESPN',leagues:{}};let failures=0;
 await pool(LEAGUE_IDS,3,async id=>{
   const file=join(dir,'leagues',`${id}.json`),previous=await readJSON(file);
   try{
     const result=await fetcher(id,previous,{now});
     // Keep data files untouched when payload is unchanged; health tracks successful checks.
     const identical=previous&&previous.league_name===result.league.name&&JSON.stringify(previous.matches)===JSON.stringify(result.matches);
     const current=identical?{...previous,stale:false}:leagueJSON(id,result.league.name,result.matches,timestamp);
     await saveChanged(file,current);leagues.push(current);
     health.leagues[id]={status:'ok',last_success:timestamp,last_change:current.last_update,error:null};
   }catch(e){
     failures++;if(previous){const retained={...previous,stale:true};leagues.push(retained);await saveChanged(file,retained);}
     let oldHealth;try{oldHealth=await readJSON(join(dir,'health.json'));}catch{}
     health.leagues[id]={status:previous?'stale':'unavailable',last_success:oldHealth?.leagues?.[id]?.last_success??null,last_change:previous?.last_update??null,error:String(e.message).slice(0,300)};
     console.error(`${id}: ${e.message}`);
   }
 });
 leagues.sort((a,b)=>LEAGUE_IDS.indexOf(a.league_id)-LEAGUE_IDS.indexOf(b.league_id));
 health.ok=failures===0;health.failed_leagues=LEAGUE_IDS.filter(id=>health.leagues[id].status!=='ok');
 // Never replace a complete aggregate with a partial first-run result.
 if(leagues.length===LEAGUE_IDS.length)await saveChanged(join(dir,'all.json'),allJSON(leagues));
 await saveChanged(join(dir,'health.json'),health);
 console.log(JSON.stringify({successful:12-failures,failed:failures,total_matches:leagues.reduce((n,l)=>n+l.total_matches,0)}));
 return health;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const h=await update();if(!h.ok)process.exitCode=1;}
