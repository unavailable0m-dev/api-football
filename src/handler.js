import {supported,LEAGUE_IDS} from './leagues.js';
const RAW='https://raw.githubusercontent.com/unavailable0m-dev/api-football/main/api';

async function cached(path,fetchImpl,now,memory){
 const old=memory.get(path);if(old&&now-old.time<30000)return {body:old.body,cached:false};
 try{const r=await fetchImpl(`${RAW}/${path}`,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`Snapshot HTTP ${r.status}`);const body=await r.json();memory.set(path,{body,time:now});return {body,cached:false};}
 catch(e){if(old)return {body:old.body,cached:true};throw e;}
}
export function createHandler(fetchImpl=fetch,clock=Date.now){const memory=new Map();return async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method==='OPTIONS'){res.statusCode=204;res.end();return;}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.setHeader('Allow','GET, HEAD, OPTIONS');res.end(JSON.stringify({error:'Method not allowed'}));return;}
 const url=new URL(req.url,'http://localhost');const segments=url.pathname.split('/').filter(Boolean);
 const id=segments.length===2&&segments[0]==='api'?segments[1]:null;
 if(id!=='all'&&!supported(id)){res.statusCode=404;res.end(JSON.stringify({error:'Unsupported route',supported_leagues:LEAGUE_IDS}));return;}
 try{
 const now=clock();const [data,health]=await Promise.all([cached(id==='all'?'all.json':`leagues/${id}.json`,fetchImpl,now,memory),cached('health.json',fetchImpl,now,memory)]);
 if(!Array.isArray(data.body.matches)||!health.body.leagues)throw new Error('Invalid stored snapshot');
 const ids=id==='all'?LEAGUE_IDS:[id];
 const checks=Object.fromEntries(ids.map(i=>[i,health.body.leagues[i]??{status:'unavailable',last_success:null}]));
 const stale=data.cached||health.cached||ids.some(i=>checks[i].status!=='ok'||!checks[i].last_success||now-Date.parse(checks[i].last_success)>10*60000);
 const body={...data.body,source:'ESPN',stale,last_check:health.body.last_attempt,league_health:checks};
 res.setHeader('Cache-Control',stale?'no-store':'public, max-age=30, s-maxage=30');res.statusCode=200;
 res.end(req.method==='HEAD'?undefined:JSON.stringify(body));
 }catch{res.statusCode=503;res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:'Stored ESPN data unavailable',stale:true,matches:[],total_matches:0,last_update:null}));}
};}
export default createHandler();
