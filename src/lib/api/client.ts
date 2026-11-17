import {z} from 'zod';
export class ApiError extends Error {constructor(public status:number,message:string){super(message);this.name='ApiError';}}
function requestSignal(user?:AbortSignal){
 if(typeof AbortSignal.timeout==='function'&&typeof AbortSignal.any==='function'){
  const deadline=AbortSignal.timeout(15000);return {signal:user?AbortSignal.any([user,deadline]):deadline,dispose:()=>{}};
 }
 // Older browsers retain unmount cancellation and bounded request duration.
 const controller=new AbortController();const abort=()=>controller.abort(user?.reason);
 const timer=setTimeout(()=>controller.abort(new DOMException('Request timed out','TimeoutError')),15000);
 if(user?.aborted)abort();else user?.addEventListener('abort',abort,{once:true});
 return {signal:controller.signal,dispose:()=>{clearTimeout(timer);user?.removeEventListener('abort',abort);}};
}
export async function apiGet<T>(path:string,schema:z.ZodType<T>,signal?:AbortSignal,base=''):Promise<T>{
 const request=requestSignal(signal);
 try{
  const response=await fetch(`${base}/api/v1${path}`,{signal:request.signal,cache:'no-store',headers:{Accept:'application/json'}});
  if(!response.ok)throw new ApiError(response.status,`API request failed (${response.status})`);
  return schema.parse(await response.json());
 }finally{request.dispose();}
}
