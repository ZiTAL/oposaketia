import {effectiveStatus} from '@/lib/catalogue';
import {getCall} from '@/lib/db';
import {apiJson,apiError} from '@/lib/api/http';
export {OPTIONS} from '@/lib/api/http';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;if(!/^[a-z0-9-]+$/.test(id)||id.length>150)return apiJson({error:{code:'NOT_FOUND',message:'Call not found'}},404);const call=await getCall(id);return call?apiJson({call:{...call,status:effectiveStatus(call)}}):apiJson({error:{code:'NOT_FOUND',message:'Call not found'}},404);}catch(error){return apiError(error);}}
