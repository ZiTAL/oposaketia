import {getCatalogue} from '@/lib/db';
import {apiJson} from '@/lib/api/http';
export {OPTIONS} from '@/lib/api/http';
export const dynamic='force-dynamic';
// Compatibility endpoint: new integrations should use the paginated /api/v1 API.
export async function GET(){try{return apiJson({calls:await getCatalogue()});}catch{return apiJson({error:'The catalogue is currently unavailable. Please try again later.'},503);}}
