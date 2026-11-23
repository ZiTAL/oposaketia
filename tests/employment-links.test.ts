import {test} from 'node:test';
import assert from 'node:assert/strict';
import {looksLikeEmploymentLink,hasCookieReloadChallenge} from '../scripts/employment-links';
test('employment discovery recognizes institutional language variants without treating results or procurement as jobs',()=>{
 for(const title of ['Bourse de l’emploi',"Bourse de l'emploi",'Empleo','Lan egin gurekin','Gurekin lan egin','Enplegu publikoa','Rejoignez-nous','Offres d’emploi','Careers','Work with us','Procesos selectivos','ÚNETE A NUESTRO EQUIPO.','Procesos de selección'])assert.equal(looksLikeEmploymentLink(title),true,title);
 for(const title of ['Dispositif de bourses Euskaraz Lan egin','Contratación pública','Procesos de selección de proveedores','Lista de admitidos a la oferta de empleo','Résultats du recrutement','Onartutakoen hautaketa zerrenda','Careers '.repeat(30)])assert.equal(looksLikeEmploymentLink(title),false,title);
});

test('employment discovery distinguishes a cookie reload challenge from ordinary cookie preferences and readable pages',()=>{
 assert.equal(hasCookieReloadChallenge(`<meta http-equiv="refresh" content="3"><script>document.cookie = 'dhd2=challenge; path=/';</script>`),true);
 assert.equal(hasCookieReloadChallenge(`<meta content="3" http-equiv='refresh'><script>document.cookie="dhd2=challenge";</script>`),true);
 assert.equal(hasCookieReloadChallenge(`<main><a href="/empleo">Empleo</a></main><script>document.cookie='consent=true';</script>`),false);
 assert.equal(hasCookieReloadChallenge(`<meta http-equiv="refresh" content="0;url=/empleo">`),false);
});
