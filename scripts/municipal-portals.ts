// Employment pages verified against the official municipal directory and
// their actual links to the Gipuzkoa selection seat, on 2026-11-18.
export const municipalPortals = {
  alkiza:{url:'https://www.alkiza.eus/eu/lan-eskaintzak',name:'Ayuntamiento de Alkiza',code:'6'},
  arama:{url:'https://www.arama.eus/eu/lan-eskaintzak',name:'Ayuntamiento de Arama',code:'12'},
  asteasu:{url:'https://www.asteasu.eus/eu/lan-eskaintzak1',name:'Ayuntamiento de Asteasu',code:'14'},
  berastegi:{url:'https://www.berastegi.eus/eu/lan-eskaintza',name:'Ayuntamiento de Berastegi',code:'22'},
  berrobi:{url:'https://www.berrobi.eus/eu/epe-lan-eskaintzak',name:'Ayuntamiento de Berrobi',code:'23'},
  irura:{url:'https://www.irura.eus/eu/lan-eskaintzak',name:'Ayuntamiento de Irura',code:'46'},
  lizartza:{url:'https://www.lizartza.eus/eu/lan-eskaintzak1',name:'Ayuntamiento de Lizartza',code:'54'},
  mendaro:{url:'https://www.mendaro.eus/eu/lan-eskaintza',name:'Ayuntamiento de Mendaro',code:'82'},
  pasaia:{url:'https://www.pasaia.eus/eu/lep',name:'Ayuntamiento de Pasaia',code:'64'},
  villabona:{url:'https://www.villabona.eus/eu/lan-eskaintzak',name:'Ayuntamiento de Villabona',code:'75'},
  amezketa:{url:'https://www.amezketa.eus/tramiteak/lan-eskaintza-publikoa-2/',name:'Ayuntamiento de Amezketa',code:'8'},
  ikaztegieta:{url:'https://www.ikaztegieta.eus/eu/enplegua',name:'Ayuntamiento de Ikaztegieta',code:'44'},
  urretxu:{url:'https://www.urretxu.eus/eu/udala/enplegua/',name:'Ayuntamiento de Urretxu',code:'77'},
  andoain: {url:'https://www.andoain.eus/eu/lan-eskaintza',name:'Ayuntamiento de Andoain',code:'9'},
  hernani: {url:'https://www.hernani.eus/eu/lan-eskaintzak-ordenatuta',name:'Ayuntamiento de Hernani',code:'40'},
  zizurkil: {url:'https://www.zizurkil.eus/eu/lan-eskaintzak',name:'Ayuntamiento de Zizurkil',code:'28'},
  elgoibar: {url:'https://elgoibar.eus/lan-eskaintza/',name:'Ayuntamiento de Elgoibar',code:'32'},
  hondarribia: {url:'https://www.hondarribia.eus/eu/lan-eskaintza',name:'Ayuntamiento de Hondarribia',code:'36'},
  ibarra: {url:'https://www.ibarra.eus/eu/lan-eskaintzak1',name:'Ayuntamiento de Ibarra',code:'42'},
  orio: {url:'https://orio.eus/lan-eskaintzak/',name:'Ayuntamiento de Orio',code:'61'},
} as const;
export type MunicipalPortal = keyof typeof municipalPortals;
