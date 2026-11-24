import {load} from 'cheerio';
import {callSchema,type Call} from '../../src/lib/catalogue';
import {OfficialClient,hash} from './http';
import {baseCall,clean,stableId} from './shared';

export const CRL_LHK_BASES='https://www.euskadi.eus/bopv2/datos/2023/01/2300110a.shtml';

export function parseCrlLhkBases(html:string,now:string):Call[]{
 const $=load(html);
 const text=clean($('.colCentralinterior').first().text());
 if(!text.includes('CONSEJO DE RELACIONES LABORALES')||!text.includes('ANEXO II AL ACUERDO')||!text.includes('ANEXO III AL ACUERDO'))throw new Error('Las bases del CRL no incluyen ambos anexos');
 if(!/sistema de concurso/i.test(text)||!/veinte \(20\) días hábiles contados a partir del día siguiente al de la publicación de la convocatoria/i.test(text))throw new Error('No se reconoce el concurso o el plazo relativo');
 const technical=text.slice(text.indexOf('ANEXO II AL ACUERDO'),text.indexOf('ANEXO III AL ACUERDO'));
 const administrative=text.slice(text.indexOf('ANEXO III AL ACUERDO'));
 if(!/una \(1\) plaza de Técnico\/a en negociación colectiva/i.test(technical)||!/Destino: Bilbao/i.test(technical)||!/título de grado o licenciatura en Derecho/i.test(technical)||!/perfil lingüístico 3 de euskera/i.test(technical))throw new Error('La plaza técnica del CRL no se reconoce');
 if(!/dos \(2\) plazas de Administrativo\/a área de relaciones laborales/i.test(administrative)||!/Destinos: Bilbao y Donostia-San Sebastián/i.test(administrative)||!/Título de Graduado en Educación Secundaria Obligatoria o el título de Bachiller, de Técnico\/a de Grado Medio de Formación Profesional o equivalente/i.test(administrative)||!/perfil lingüístico 2 de euskera/i.test(administrative))throw new Error('Las plazas administrativas del CRL no se reconocen');
 const shared=hash(html);
 const technician=baseCall('crl-lhk',CRL_LHK_BASES,now,'Euskadi');
 technician.id=stableId('crl-lhk',`${CRL_LHK_BASES}#anexo-ii`);
 technician.title='Técnico/a en negociación colectiva';technician.organization='Consejo de Relaciones Laborales';
 technician.province='Bizkaia';technician.location='Bilbao';technician.category='Administración';technician.group='A2';technician.places=1;
 technician.educationText='Grado o licenciatura en Derecho.';technician.language={name:'euskera',level:'C1'};technician.languageStatus='known';
 technician.requirements=['Grado o licenciatura en Derecho.','Perfil lingüístico 3 de euskera preceptivo.'];
 technician.status='Cerrada';technician.description='OPE 2022 de acceso libre por concurso de méritos; plazo relativo de veinte días hábiles desde la publicación en el BOPV. No se publica temario de examen.';
 technician.sourceHash=shared;technician.documents=[{title:'Anexo II: bases específicas y bases generales (BOPV)',url:CRL_LHK_BASES,kind:'bases',checkedAt:now,sha256:shared}];
 const admin=baseCall('crl-lhk',CRL_LHK_BASES,now,'Euskadi');
 admin.id=stableId('crl-lhk',`${CRL_LHK_BASES}#anexo-iii`);
 admin.title='Administrativo/a del área de relaciones laborales';admin.organization='Consejo de Relaciones Laborales';
 admin.province=null;admin.location='Bilbao y Donostia-San Sebastián';admin.category='Administración';admin.group='C1-C2';admin.places=2;
 admin.educationText='Título de Graduado en Educación Secundaria Obligatoria, Bachiller, Técnico/a de Grado Medio de Formación Profesional o equivalente.';
 admin.language={name:'euskera',level:'B2'};admin.languageStatus='known';
 admin.requirements=[admin.educationText,'Perfil lingüístico 2 de euskera preceptivo.'];
 admin.status='Cerrada';admin.description=technician.description;
 admin.sourceHash=shared;admin.documents=[{title:'Anexo III: bases específicas y bases generales (BOPV)',url:CRL_LHK_BASES,kind:'bases',checkedAt:now,sha256:shared}];
 return [callSchema.parse(technician),callSchema.parse(admin)];
}

export async function scrapeCrlLhk(client:OfficialClient,now:string):Promise<Call[]>{
 return parseCrlLhkBases(await client.text(CRL_LHK_BASES),now);
}
