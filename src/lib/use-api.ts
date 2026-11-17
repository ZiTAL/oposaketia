'use client';
import {useEffect,useState,useCallback} from 'react';
import type {z} from 'zod';
import {apiGet} from './api/client';
export function useApi<T>(path:string,schema:z.ZodType<T>){
 const [attempt,setAttempt]=useState(0);
 const [state,setState]=useState<{data:T|null;loading:boolean;error:boolean}>({data:null,loading:true,error:false});
 useEffect(()=>{const controller=new AbortController();let active=true;
  setState({data:null,loading:true,error:false});
  apiGet(path,schema,controller.signal).then(data=>{if(active)setState({data,loading:false,error:false});}).catch(()=>{if(active)setState({data:null,loading:false,error:true});});
  return()=>{active=false;controller.abort();};
 },[path,schema,attempt]);
 const retry=useCallback(()=>setAttempt(value=>value+1),[]);
 return {...state,retry};
}
