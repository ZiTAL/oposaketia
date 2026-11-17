import {z} from 'zod';
import {callSchema} from '../catalogue';
import {filterDefinitions} from './query';
import {sourceSchema,paginationSchema,optionsSchema,sortChoices} from './contracts';
function schema(value:z.ZodType){const result=z.toJSONSchema(value,{target:'draft-2020-12',unrepresentable:'any'});const {$schema,...rest}=result;void $schema;return rest;}
const ref=(name:string)=>({$ref:`#/components/schemas/${name}`});
const response=(description:string,value:unknown)=>({description,headers:{'Access-Control-Allow-Origin':{schema:{type:'string'},description:'* — Public API without credentials'}},content:{'application/json':{schema:value}}});
const errors={'400':response('Invalid parameters',ref('Error')),'503':response('Catalogue temporarily unavailable',ref('Error'))};
export const openapi={
 openapi:'3.1.0',info:{title:'Oposaketia · Public API',version:'1.0.0',description:'Read-only API for public employment calls and official documents from Euskadi, Navarre and Iparralde. No registration or API key required. CORS allows clients from any origin. Coverage is partial. Official content, source descriptions and stable filter values retain their original language; obtain accepted values from /options. List responses omit topics, requirements and documents (empty arrays); use the detail endpoint to retrieve them. The website keeps qualifications and favorites in the browser.'},
 servers:[{url:'/api/v1',description:'API v1 on this server'}],security:[],tags:[{name:'Calls'},{name:'Sources'},{name:'Catalogs'},{name:'Service'}],
 paths:{
  '/calls':{get:{operationId:'listCalls',tags:['Calls'],summary:'Search and paginate public employment calls',description:'Repeat province, category, status, territory, source or qualification to select multiple values. Values within a filter use OR; different filters use AND. Qualification matching is advisory and does not establish eligibility. Filters use the stable values returned by /options. Results have stable ordering with id as a tie-breaker. Out-of-range pages return an empty calls array. Status is evaluated against the current UTC date.',parameters:[
   {name:'q',in:'query',description:'Search title, organization, location or province; case-insensitive and accent-insensitive',schema:{type:'string',maxLength:200}},
   {name:'page',in:'query',schema:{type:'integer',minimum:1,maximum:100000,default:1}},
   {name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:200,default:20}},
   {name:'sort',in:'query',schema:{type:'string',enum:sortChoices,default:'title'}},
   ...Object.entries(filterDefinitions).map(([name,values])=>({name,in:'query',style:'form',explode:true,description:name==='province'?'Use Sin concretar for calls without a confirmed province':'Repeat this parameter to select multiple values',schema:{type:'array',items:{type:'string',enum:values},uniqueItems:true}})),
  ],responses:{'200':response('Page of public employment calls',{type:'object',required:['calls','pagination'],properties:{calls:{type:'array',items:ref('Call')},pagination:ref('Pagination')}}),...errors}}},
  '/calls/{id}':{get:{operationId:'getCall',tags:['Calls'],summary:'Get a full call, eligibility requirements, documents and syllabus',parameters:[{name:'id',in:'path',required:true,schema:{type:'string',pattern:'^[a-z0-9-]+$',maxLength:150}}],responses:{'200':response('Full call',{type:'object',required:['call'],properties:{call:ref('Call')}}),'404':response('Call not found',ref('Error')),'503':errors['503']}}},
  '/sources':{get:{operationId:'listSources',tags:['Sources'],summary:'List sources, coverage and update status',responses:{'200':response('Sources with their latest public update report',{type:'object',required:['sources'],properties:{sources:{type:'array',items:ref('Source')}}}),'503':errors['503']}}},
  '/options':{get:{operationId:'getOptions',tags:['Catalogs'],summary:'Get available filter and qualification values',responses:{'200':response('Stable filter values',ref('Options'))}}},
  '/health':{get:{operationId:'getHealth',tags:['Service'],summary:'Check service health and catalogue connectivity',responses:{'200':response('Available',{type:'object',required:['status','mode'],properties:{status:{type:'string',const:'ok'},mode:{type:'string',enum:['demo','catalogue']}}}),'503':response('Unavailable',{type:'object',required:['status'],properties:{status:{type:'string',const:'unavailable'}}})}}},
  '/openapi.json':{get:{operationId:'getOpenApi',tags:['Service'],summary:'Download this OpenAPI specification',responses:{'200':response('OpenAPI 3.1 document',{type:'object'})}}},
 },
 components:{schemas:{
  Call:schema(callSchema), Source:schema(sourceSchema), Pagination:schema(paginationSchema), Options:schema(optionsSchema),
  Error:{type:'object',required:['error'],properties:{error:{type:'object',required:['code','message'],properties:{code:{type:'string',enum:['INVALID_QUERY','NOT_FOUND','UNAVAILABLE']},message:{type:'string'}}}}},
 }},
};
