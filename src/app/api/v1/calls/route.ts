import {getCatalogue} from '@/lib/db';
import {parseListQuery,selectCalls} from '@/lib/api/query';
import {apiJson,apiError} from '@/lib/api/http';
export {OPTIONS} from '@/lib/api/http';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const query=parseListQuery(new URL(request.url).searchParams);return apiJson(selectCalls(await getCatalogue(),query));}catch(error){return apiError(error);}}
