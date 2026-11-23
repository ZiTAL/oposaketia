import {normalize} from '../src/lib/catalogue';
export function looksLikeEmploymentLink(title:string):boolean{
 const text=normalize(title.trim());
 return title.length<=150&&!/^dispositif de bourses\b/.test(text)&&/bourse de l['’]emploi|empleo publico|ofertas? de empleo|^empleo$|oposici|enplegu|lan.eskaint|lan.poltsa|hautaketa|procesos selectivos|^procesos de seleccion[.!]?$|^unete a nuestro equipo[.!]?$|trabaja con|trabaja en|recrutement|offres?.d.emploi|emploi.public|^emplois?$|nous.rejoindre|rejoignez.nous|la.(?:ville|mairie).recrute|gurekin.lan.egin|lan.egin.gurekin|^careers?$|^jobs?$|job.(?:openings|vacancies|offers)|^join us$|work.with.us/.test(text)&&!/admitid|excluid|resultado|calificaci|nombramiento|onartut|baztert|r[eé]sultats|liste.des.candidats/.test(text);
}

export function hasCookieReloadChallenge(html:string):boolean{
 return /document\.cookie\s*=\s*['"]dhd2=/i.test(html)&&/<meta\b[^>]*http-equiv\s*=\s*['"]refresh['"][^>]*>/i.test(html);
}
