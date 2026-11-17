import {GET as health} from '../../health/route';
import {publicHeaders} from '@/lib/api/http';
export {OPTIONS} from '@/lib/api/http';
export const dynamic='force-dynamic';
export async function GET(){const response=await health();return new Response(response.body,{status:response.status,headers:{...publicHeaders,'Content-Type':'application/json'}});}
