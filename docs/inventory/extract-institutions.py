import json,re,unicodedata
from pathlib import Path
# Explicitly enumerated institutions in the supplied report; groups without names
# remain in original-report.md and are not turned into invented institutions.
groups=[
('Euskadi',None,21,'Administración General de la Comunidad Autónoma de Euskadi;HABE;IVAP;Eustat;Emakunde;Academia Vasca de Policía y Emergencias;Osalan;Kontsumobide;Autoridad Vasca de la Competencia;Gogora'),
('Euskadi',None,23,'Osakidetza;Lanbide;eLankidetza;Cyberzaintza;Aukerak;Ente Vasco de la Energía;Euskal Trenbide Sarea;Agencia Vasca del Agua URA;Instituto Vasco de Finanzas;Unibasq;Euskal Irrati Telebista;Instituto Vasco Etxepare;SPRI;Euskadiko Kirol Portuak'),
('Euskadi',None,25,'HAZI;ELIKA;Musikene;BIOEF;EGO;Basque Team;Haurreskolak;BRTA'),
('Euskadi',None,27,'EiTB Media;Euskotren;Euskotren Participaciones;EJIE;Itelazpi;Finkatze Kapitala Finkatuz;Euskalmet;Zumaiako Kirol Portua;NEIKER;VISESA;Alokabide;IHOBE;Osatek;Basquetour;Orquesta de Euskadi;BIMEP;CADEM;Sociedad de Hidrocarburos de Euskadi;Basque Trade & Investment'),
('Euskadi',None,29,'Parlamento Vasco;Tribunal Vasco de Cuentas Públicas;Ararteko;Agencia Vasca de Protección de Datos;Consejo de Relaciones Laborales;Consejo Económico y Social Vasco;Universidad del País Vasco'),
('Euskadi','Araba / Álava',31,'Diputación Foral de Álava;Instituto Foral de Bienestar Social;Instituto Foral de la Juventud;Bomberos Forales de Álava;Centro de Cálculo de Álava;Álava Agencia de Desarrollo;Naturgolf;Indesa 2010;VIA Promoción del Aeropuerto de Vitoria;Enargi Araba;Artium;Catedral Santa María;Valle Salado de Añana;Vitoria-Gasteiz Araba Mobility Lab'),
('Euskadi','Bizkaia',33,'Diputación Foral de Bizkaia;IFAS;Bizkaikoa;GaiKuntza;Aparkabisa;Azpiegiturak;Basalan;BEAZ;Crowdfunding Bizkaia;Palacio Euskalduna;Garbiker;Interbiak;Lantik;Seed Capital;Bizkaia Mikro;Zugaztel;Azkue;BiscayTIK;Bilbao Orkestra Sinfonikoa;Bizkaia Bizkaialde'),
('Euskadi','Gipuzkoa',35,'Diputación Foral de Gipuzkoa;Uliazpi;Kabia;IZFE;Bidegi;Etorlur;Gipuzkoa Zainduz;Kirolgi;Sueskola Gipuzkoa;Naturklima;Ziur;Adinberri;Mubil;BSTK'),
('Navarra','Navarra',41,'Administración de la Comunidad Foral de Navarra;Parlamento de Navarra;Defensor del Pueblo de Navarra;Cámara de Comptos;Consejo de Navarra;Oficina de Buenas Prácticas y Anticorrupción;Universidad Pública de Navarra'),
('Navarra','Navarra',43,'Instituto Navarro para la Igualdad;Oficina de Análisis y Prospección;Euskarabidea;Instituto Navarro de la Juventud;Hacienda Foral de Navarra;Agencia Navarra de Autonomía y Desarrollo de las Personas;Servicio Navarro de Empleo;Servicio Navarro de Salud Osasunbidea;Instituto de Salud Pública y Laboral de Navarra;Instituto Navarro del Deporte'),
('Navarra','Navarra',45,'Transporte Sanitario de Navarra Bidean;Ciudad Agroalimentaria de Tudela;CEIN;CNAI;CPEN;Instituto Navarro de Inversiones;INTIA;Nafarbide;NASERTIC;NASUVINSA;NICDO;NILSA;OREKAN Gestión Ambiental de Navarra;Potasas de Subiza POSUSA;Salinas de Navarra;SODENA;Start Up;TRACASA;TRACASA Instrumental'),
('Navarra','Navarra',47,'Fundación Miguel Servet;Fundación Baluarte;Fundación Miguel Induráin;Gizain;Fundación Pública Navarra para la Provisión de Apoyos a Personas con Discapacidad'),
('Navarra','Navarra',51,'Mancomunidad de la Comarca de Pamplona;Mancomunidad de Montejurra;Mancomunidad de la Ribera;Mancomunidad de Mairaga;Mancomunidad de Sakana;Mancomunidad de Valdizarbe;Mancomunidad de Aguas del Moncayo'),
('País Vasco francés',None,55,'République française;Région Nouvelle-Aquitaine;Département des Pyrénées-Atlantiques;Communauté d’Agglomération Pays Basque'),
('País Vasco francés',None,59,'Sous-préfecture de Bayonne;Préfecture des Pyrénées-Atlantiques;SM du SCoT du Pays Basque et du Seignanx;SM du Bas Adour Maritime;SM de préfiguration du Parc naturel régional Montagne Basque;EPFL Pays Basque;Commission Syndicale de la Vallée de Baïgorry;Commission Syndicale du Pays de Cize;Commission Syndicale de l’Ostabaret;Commission Syndicale du Pays de Soule;Commission Syndicale du Bois de Mixe;SIVU Mondarrain Artzamendi;Office de Tourisme Pays Basque;Office de tourisme communautaire de Bayonne;Anglet Tourisme;Biarritz Tourisme;OT Bidart;OT Cambo-les-Bains;Hendaye Tourisme et Commerce'),
('País Vasco francés',None,79,'Agence régionale de santé Nouvelle-Aquitaine;CPAM des Pyrénées-Atlantiques;CAF des Pyrénées-Atlantiques;MSA Sud Aquitaine;Groupement Hospitalier de Territoire Navarre Côte Basque;Centre Hospitalier de la Côte Basque'),
('País Vasco francés',None,81,'Université de Pau et des Pays de l’Adour;CCI Bayonne Pays Basque;Chambre de Métiers et de l’Artisanat;Chambre d’Agriculture;Banque de France;DSDEN;SDIS;France Travail'),
('Euskadi',None,85,'Delegación del Gobierno en el País Vasco;AEAT;INSS;TGSS;SEPE;DGT;Guardia Civil;Policía Nacional;Administración de Justicia;Instituciones Penitenciarias'),
('Navarra','Navarra',85,'Delegación del Gobierno en Navarra'),
('País Vasco francés',None,87,'Sous-préfecture d’Oloron-Sainte-Marie;DDFIP;Douanes;Police nationale;Gendarmerie nationale;Justice;Administration pénitentiaire'),
('Euskadi',None,89,'RENFE;ADIF;AENA;Correos'),
]
destination=Path('docs/inventory/institutions.json')
previous={row['id']:row for row in json.loads(destination.read_text())} if destination.exists() else {}
rows=[]
for territory,province,line,names in groups:
 for name in names.split(';'):
  slug=re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',name).encode('ascii','ignore').decode().lower()).strip('-')
  rows.append(dict(id='institution-'+slug,name=name,territory=territory,province=province,reportLine=line,status='pending',note='Txostenean izendatua; erakundearen izaera eta enplegu-atariaren estaldura egiaztatzeko.'))
assert len({r['id'] for r in rows})==len(rows)
rows=[{**row,**previous.get(row['id'],{})} for row in rows]
destination.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print(len(rows),'institutions')
