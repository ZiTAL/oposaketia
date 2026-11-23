import {load} from 'cheerio';
import {callSchema,normalize,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,parseDate,pdfText,stableId} from './shared';

export const ANGLET_JOBS='https://espace-pro.anglet-tourisme.com/references-actualites/articles/anglet-cote-basque-recrute/';
const reviewed:Record<string,{sha256:string;requirements:string[]}>= {
 'Attache_Commercial_OTANGLET.pdf':{sha256:'1f367262c8382ce30b62dffe619606349f1eaadf79a2705baec6e4166369f480',requirements:['Permis B (offre PDF officielle vérifiée visuellement).']},
 'Conseil_Sejour_OTANGLET.pdf':{sha256:'0df2de901d1af02c1f6de5bfd48b8a24feb3a217c72a133d1dadbad3f5a568fc',requirements:['Bonne maîtrise orale de l’anglais et de l’espagnol; permis B (offre PDF officielle vérifiée visuellement).']},
};
export function parseAngletJobs(html:string,now:string):Call[]{
 const $=load(html);if(normalize(clean($('h1').first().text()))!=='anglet cote basque recrute')throw new Error('Anglet recruitment page changed');
 const calls:Call[]=[];
 $('h2').each((_,node)=>{
  const heading=clean($(node).text());if(!/^poste (?:d['’]|de )/.test(normalize(heading)))return;
  let section=$(node).parent();for(let i=0;i<6&&section.find('a[href$=".pdf"]').length===0;i++)section=section.parent();
  if(section.find('h2').length!==1)throw new Error('Anglet vacancy section is ambiguous');
  const text=clean(section.text()),raw=section.find('a[href$=".pdf"]').first().attr('href');if(!raw)throw new Error('Anglet vacancy PDF missing');
  const url=new URL(raw,ANGLET_JOBS);if(url.protocol==='http:'&&url.hostname==='espace-pro.anglet-tourisme.com')url.protocol='https:';
  if(url.origin!=='https://espace-pro.anglet-tourisme.com'||!/^\/uploads\/\d{4}\/\d{2}\/[A-Za-z0-9_-]+\.pdf$/.test(url.pathname)||url.search||url.hash)throw new Error('Unexpected Anglet PDF');
  const filename=url.pathname.split('/').at(-1)!;if(!reviewed[filename])throw new Error('Anglet PDF requires visual review');
  const m=text.match(/(?:avant le|avant)\s+(\d{2}\/\d{2}\/\d{4})/i),deadline=m?parseDate(m[1]):null;
  if(!deadline||!/poste (?:basé|base) à anglet/i.test(text)||!/recrutement est désormais clos/i.test(text))throw new Error('Anglet location, closing date or phase unconfirmed');
  const call=baseCall('anglet-tourisme',ANGLET_JOBS,now,'País Vasco francés');call.id=stableId('anglet-tourisme',url.href);call.title=heading;call.organization='Office de Tourisme et de Loisirs d’Anglet';call.province='Lapurdi';call.location='Anglet';call.places=1;call.deadline=deadline;call.status='Cerrada';
  call.educationText='Aucun diplôme obligatoire identifié dans le document officiel vérifié visuellement; consulter l’offre.';call.requirements=reviewed[filename].requirements;
  call.description='Offre historique de l’EPIC Anglet Tourisme. Le site officiel confirme que le poste est pourvu et que le recrutement est clos. Le PDF officiel a été vérifié visuellement; aucun concours ni programme d’examen n’est annoncé.';
  call.documents=[{title:'Offre d’emploi officielle',url:url.href,kind:'bases',checkedAt:null,sha256:null}];call.sourceHash=hash($.html(section));calls.push(callSchema.parse(call));
 });
 if(!calls.length||new Set(calls.map(c=>c.id)).size!==calls.length)throw new Error('Anglet recruitment list empty or duplicated');return calls;
}
export async function scrapeAngletTourisme(client:OfficialClient,now:string,warn:(message:string)=>void):Promise<Call[]>{
 const calls=parseAngletJobs(await client.text(ANGLET_JOBS),now);for(const call of calls){const doc=call.documents[0],name=new URL(doc.url).pathname.split('/').at(-1)!;try{const pdf=await pdfText(client,doc.url);if(pdf.sha256!==reviewed[name].sha256)throw new Error('Scanned PDF changed since visual review');doc.sha256=pdf.sha256;doc.checkedAt=now;}catch(error){warn(`${doc.url}: ${error instanceof Error?error.message:'PDF unavailable'}`);throw error;}}return calls;
}
