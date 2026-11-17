import {InvalidQuery} from './query';
export const publicHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'Accept, Content-Type','Access-Control-Max-Age':'86400','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
export function apiJson(body:unknown,status=200){return Response.json(body,{status,headers:publicHeaders});}
export function OPTIONS(){return new Response(null,{status:204,headers:publicHeaders});}
export function apiError(error:unknown){if(error instanceof InvalidQuery)return apiJson({error:{code:'INVALID_QUERY',message:error.message}},400);console.error('Public API request failed',error instanceof Error?error.message:'Unknown error');return apiJson({error:{code:'UNAVAILABLE',message:'The catalogue is currently unavailable. Please try again later.'}},503);}
