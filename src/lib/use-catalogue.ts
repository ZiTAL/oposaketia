'use client';
import {useEffect,useState,useCallback} from 'react';
import {apiGet} from './api/client';
import {callListSchema} from './api/contracts';
import type {Call} from './catalogue';
export function useCatalogue(){
 const [attempt,setAttempt]=useState(0);const [state,setState]=useState<{calls:Call[];loading:boolean;unavailable:boolean}>({calls:[],loading:true,unavailable:false});
 useEffect(()=>{const controller=new AbortController();let active=true;
  setState({calls:[],loading:true,unavailable:false});
  async function load(){
   const first=await apiGet('/calls?limit=200',callListSchema,controller.signal);const calls=[...first.calls];
   // Bounded concurrency; the profile remains local, only public catalogue pages are fetched.
   for(let page=2;page<=first.pagination.pages;page+=4){
    const batch=await Promise.all(Array.from({length:Math.min(4,first.pagination.pages-page+1)},(_,offset)=>apiGet(`/calls?limit=200&page=${page+offset}`,callListSchema,controller.signal)));
    for(const response of batch)calls.push(...response.calls);
   }
   if(active)setState({calls:[...new Map(calls.map(call=>[call.id,call])).values()],loading:false,unavailable:false});
  }
  load().catch(()=>{if(active)setState({calls:[],loading:false,unavailable:true});});
  return()=>{active=false;controller.abort();};
 },[attempt]);
 const retry=useCallback(()=>setAttempt(value=>value+1),[]);
 return {...state,retry};
}
