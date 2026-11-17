import {getSourceReports} from '@/lib/db';
import {sources} from '../../../../../scripts/sources';
import {apiJson,apiError} from '@/lib/api/http';
export {OPTIONS} from '@/lib/api/http';
export const dynamic='force-dynamic';
export async function GET(){try{const reports=await getSourceReports();return apiJson({sources:sources.map(source=>{const report=reports.find(item=>item.id===source.id);return {...source,report:report?{last_success:report.last_success,status:report.status,count:report.count,attemptedAt:report.attemptedAt,warningCount:report.warningCount}:null};})});}catch(error){return apiError(error);}}
