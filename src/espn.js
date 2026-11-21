import {supported} from './leagues.js';
export const ESPN_BASE='https://site.api.espn.com/apis/site/v2/sports/soccer';
export async function fetchScoreboard(id, dates, {fetchImpl=fetch,retries=2}={}) {
  if (!supported(id)) throw new Error('Unsupported league');
  const url = new URL(`${ESPN_BASE}/${id}/scoreboard`);
  url.searchParams.set('dates', dates); url.searchParams.set('limit','1000');
  let failure;
  for(let attempt=0;attempt<=retries;attempt++){
    try {
      const response=await fetchImpl(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/json'}});
      if(!response.ok) { const e=new Error(`ESPN HTTP ${response.status}`); e.retryable=response.status===429||response.status>=500; throw e; }
      const body=await response.json();
      if(!Array.isArray(body.events)||!body.leagues?.some(l=>l.slug===id && typeof l.name==='string')) throw new Error('Invalid ESPN schema or league identity');
      if(body.events.length>=1000) throw new Error('Potential ESPN truncation; refusing partial replacement');
      return body;
    } catch(e){failure=e; if(e.retryable===false||attempt===retries) break; await new Promise(r=>setTimeout(r,500*2**attempt));}
  }
  throw failure;
}
export async function pool(items, limit, work) {
 const result=new Array(items.length); let cursor=0;
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(cursor<items.length){const i=cursor++;result[i]=await work(items[i],i);}}));
 return result;
}
