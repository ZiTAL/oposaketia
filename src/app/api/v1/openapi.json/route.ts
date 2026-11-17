import {openapi} from '@/lib/api/openapi';
import {apiJson} from '@/lib/api/http';
export {OPTIONS} from '@/lib/api/http';
export function GET(){return apiJson(openapi);}
