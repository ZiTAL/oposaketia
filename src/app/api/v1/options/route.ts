import {categoryChoices,provinceChoices,statusChoices,territories,qualifications} from '@/lib/catalogue';
import {sortChoices} from '@/lib/api/contracts';
import {sources} from '../../../../../scripts/sources';
import {apiJson} from '@/lib/api/http';
export {OPTIONS} from '@/lib/api/http';
export function GET(){return apiJson({provinces:provinceChoices,categories:categoryChoices,statuses:statusChoices,territories,qualifications,sources:sources.map(({id,name})=>({id,name})),sorts:sortChoices});}
