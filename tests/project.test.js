import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {normalizeEvent,filterMatches} from '../src/filterMatches.js';
import {fetchScoreboard} from '../src/espn.js';
import {fetchMatches,dateQueries} from '../src/fetchMatches.js';
import {update,saveChanged} from '../src/update.js';
import {createHandler} from '../src/handler.js';
import {LEAGUE_IDS} from '../src/leagues.js';
const league={slug:'eng.1',name:'English Premier League'};
const fixture=(id='101',state='pre',score='0')=>({id,date:'2026-11-21T20:00:00Z',name:'Home vs Away',competitions:[{status:{type:{state},displayClock:'67:00'},competitors:[{homeAway:'home',score,team:{displayName:'Home'}},{homeAway:'away',score:'1',team:{displayName:'Away'}}]}]});
test('pre: preserve original names, null missing values and pre scores',()=>{const m=normalizeEvent(fixture(),league);assert.equal(m.state,'pre');assert.equal(m.home_score,null);assert.equal(m.home_team.logo,null);assert.equal(m.venue,null);assert.equal(m.minute,null);});
test('live: ESPN clock and numeric scores update',()=>{const a=normalizeEvent(fixture('101','in','2'),league),b=normalizeEvent(fixture('101','in','3'),league);assert.equal(a.minute,'67:00');assert.equal(b.home_score,3);});
test('post removed; live/pre retained; unique IDs; chronological order',()=>{const list=['pre','in','post'].map((s,i)=>normalizeEvent(fixture(String(i),s),league));assert.equal(list[2],null);assert.equal(filterMatches([...list,list[0]]).length,2);});
test('invalid state/schema rejected, never silently treated as empty',()=>{assert.throws(()=>normalizeEvent(fixture('1','unknown'),league));});
test('HTTP errors and invalid ESPN JSON do not become empty successes',async()=>{
 await assert.rejects(fetchScoreboard('eng.1','20261121',{retries:0,fetchImpl:async()=>({ok:false,status:403})}));
 await assert.rejects(fetchScoreboard('eng.1','20261121',{retries:0,fetchImpl:async()=>({ok:true,json:async()=>({})})}));
 await assert.rejects(fetchScoreboard('eng.1','20261121',{retries:0,fetchImpl:async()=>({ok:true,json:async()=>{throw new Error('JSON');}})}));
});
test('prior cached dates outside horizon are rechecked',()=>{const dates=dateQueries({matches:[{date:'2026-10-01T20:00Z'},{date:'2026-12-05T20:00Z'}]},new Date('2026-11-21T18:00Z'));assert.ok(dates.includes('20261001'));assert.ok(dates.includes('20261205'));});
test('in to post transition is removed on authoritative refresh; valid empty supported',async()=>{
 const old={matches:[normalizeEvent(fixture('101','in'),league)]};
 const result=await fetchMatches('eng.1',old,{now:new Date('2026-11-21'),fetcher:async()=>({leagues:[league],events:[fixture('101','post')]})});assert.deepEqual(result.matches,[]);
 const empty=await fetchMatches('eng.1',null,{now:new Date('2026-11-21'),fetcher:async()=>({leagues:[league],events:[]})});assert.deepEqual(empty.matches,[]);
});
test('missing prior event is uncertain, not permission to delete pre/in',async()=>{await assert.rejects(fetchMatches('eng.1',{matches:[normalizeEvent(fixture(),league)]},{now:new Date('2026-11-21'),fetcher:async()=>({leagues:[league],events:[]})}));});
test('12-league update, failure isolation, aggregate, JSON validity, no unchanged rewrites',async()=>{
 const root=await mkdtemp(join(tmpdir(),'football-test-'));const now=new Date('2026-11-21T18:00Z');
 const good=async id=>({league:{slug:id,name:id},matches:[]});
 await update({root,now,fetcher:good});
 const file=join(root,'api/leagues/eng.1.json'),before=await readFile(file,'utf8');
 const health=await update({root,now:new Date('2026-11-21T18:05Z'),fetcher:async id=>{if(id==='eng.1')throw new Error('offline');return good(id);}});
 assert.equal(health.leagues['eng.1'].status,'stale');assert.equal(health.leagues['esp.1'].status,'ok');assert.deepEqual(JSON.parse(await readFile(file,'utf8')).matches,JSON.parse(before).matches);assert.equal(JSON.parse(await readFile(file,'utf8')).stale,true);
 assert.equal(JSON.parse(await readFile(join(root,'api/all.json'),'utf8')).total_leagues,12);
 assert.equal(await saveChanged(file,JSON.parse(await readFile(file,'utf8'))),false);
});
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};}
test('dynamic all and all 12 league routes; invalid ID 404; no ESPN fetch from a route',async()=>{
 const calls=[];const time=Date.now();
 const h=createHandler(async url=>{calls.push(String(url));return {ok:true,json:async()=>String(url).endsWith('health.json')?{last_attempt:new Date(time).toISOString(),leagues:Object.fromEntries(LEAGUE_IDS.map(id=>[id,{status:'ok',last_success:new Date(time).toISOString()}]))}:{matches:[],total_matches:0,last_update:new Date(time).toISOString()}};},()=>time);
 for(const id of ['all',...LEAGUE_IDS]){const r=response();await h({url:'/api/'+id,method:'GET'},r);assert.equal(r.statusCode,200);assert.deepEqual(JSON.parse(r.body).matches,[]);}
 const r=response();await h({url:'/api/not-real',method:'GET'},r);assert.equal(r.statusCode,404);
 assert.ok(calls.every(url=>url.startsWith('https://raw.githubusercontent.com/')));
});
