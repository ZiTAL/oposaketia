# Sektore publikoaren inbentarioaren integrazioa

Jarraipen automatikoaren konfigurazioa: [automation.md](automation.md).

Erabiltzaileak emandako txostena `original-report.md` fitxategian dago.
Bertako aipamen-markek ez dituzte jatorrizko URLak gordetzen; izenak eta
kopuruak iturri ofizialetan egiaztatu behar dira.

## Egoera

- `municipalities.json`: iturri ofizialekin zuzendutako 682 udalerri eta commune.
  Araba 51, Bizkaia 113, Gipuzkoa 88, Nafarroa 272 eta Iparralde 158.
- Nafarroako zerrenda Nastaten 2026-10-20ko izendegi ofizialarekin ordezkatu da:
  272 udalerri, kode ofizialekin eta egiaztapenaren jatorriarekin.
  Iturria: https://nastat.navarra.es/es/recursos/nomenclator
- Euskadiko izenak eta kodeak tokiko entitateen erregistro ofizialarekin
  egiaztatu dira: 252 udalerri, Usansolo barne. Leaburu eta Arrankudiaga-Zollo
  izen ofizialak erabiltzen dira, txosteneko aldaerak alias gisa gordeta.
- Iparraldeko 158 communeak 64 departamenduko datu ofizialetan egiaztatu dira,
  CAPBko SIREN 200067106 erabiliz. Arraute-Charritte izena zuzendu da.
- `institutions.json`: txostenean izendatutako 213 erakunde eta zerbitzu.
  Zerrendak ez du izaera juridikoa edo enplegu-iturriaren estaldura egiaztatzen.
- `institutional-blocks.json`: erakunde eta erakunde multzoen aipamenak,
  jatorrizko lerroarekin. Blokeak oraindik ez dira erakunde indibidualen
  erregistro egiaztatuak; banakako izenak eta enplegu-atariak berrikusi behar dira.
- Udalerrien `pending` egoerak zuzeneko iturriaren egiaztapena falta dela esan
  nahi du. Euskadi, Lanbide edo Nafarroako iturri agregatuetan udal bateko fitxak
  egoteak ez du haren deialdi guztien estaldura frogatzen.
- `aggregate-partial` egoerak martxan dagoen iturri agregatu batean erakundearen
  benetako fitxak aurkitu direla adierazten du. `recordEvidence` eremuak
  auditoretzaren data, fitxa kopurua eta iturriak gordetzen ditu; ez du zuzeneko
  atari osoaren berrikuspena ordezkatzen.

## Lehen bloke integratua: CAPB / Euskal Hirigune Elkargoa

Iturria: https://www.communaute-paysbasque.fr/linstitution/nos-offres-demploi

`capb` konektoreak hasierako orri publikoko eskaintzak irakurtzen ditu,
berezko hautagaitza orokorra baztertzen du, eta lanpostuko fitxak lotzen ditu.
Argitaratutako epea, tokia eta taldea mantentzen ditu. Lanpostu-fitxan
esplizituki eskatutako diplomak eta gidabaimenak jasotzen ditu; merezimendu
gisa aipatutako ikasketak ez ditu sarbide-baldintza bihurtzen. Probintzia ezin
bada kokapen esplizitutik baieztatu, zehaztu gabe uzten du. Ez du
gai-zerrendarik asmatzen. Eskaintzak kontratazio mota desberdinetakoak izan
daitezke; ez dira guztiak azterketa bidezko hautaketak.

Lehen kontsulta: 2026-11-17. Hiru fitxa eskuratu eta tokiko katalogora inportatu
dira. Aplikazioaren eta scraper-aren irudiak berreraiki dira, eta konektorea
tokiko aldizkako bilketan aktibo dago. API publikoan `source=capb` iragazkia
erabil daiteke.

2026-11-23ko egiaztapenean lau fitxa aktibo berreskuratu dira, intzidentziarik
gabe. Amikuzeko gazte-animatzailearen fitxak DESJEPS, DEFA, BEATEP edo BPJEPS
eta PSC1 eskatzen ditu; izendapen literalak gordetzen dira, ikasketa-iragazkiko
maila orokor batekin parekatu gabe. Beste bi fitxek B gidabaimena eskatzen dute.

## Hurrengo blokeak

1. Euskadiko administrazio autonomikoa eta erakunde autonomoak.
2. Euskadiko sozietateak, fundazioak, partzuergoak eta erakunde independenteak.
3. Arabako, Bizkaiko eta Gipuzkoako foru erakundeak.
4. Nafarroako erakundeak, sozietateak, fundazioak eta NUP.
5. Iparraldeko gainerako erakundeak eta lurraldeaz gaindiko zerbitzuak.
6. Udalerriak, banan-banan: lehenik direktorio ofizialak egiaztatu eta gero
   enplegu atariak, deialdiak eta dokumentuak konektatu.

Bloke bat amaitutzat jotzeko iturri ofiziala, konektorea edo egiaztatutako
estaldura agregatua, benetako kontsultaren emaitza eta mugak dokumentatu.

## 2026-11-17ko hurrengo blokeak

| Konektorea | Benetako kontsultako fitxak | Muga nagusia |
| --- | ---: | --- |
| `cpen` | 12 | Atari honetako eskaintzak; Tracasak bere ataria du. Argitaratu gabeko epeak ezezagunak dira. |
| `gipuzkoa` | 44 | OP eta BT prozesuak; barneko CI/LD hornidurak kanpoan. |
| `bizkaia` | 22 | Indarreko deialdien zerrenda; ez ditu foru sozietateen atari guztiak estaltzen. |
| `gobierno-vasco` | 20 | Lehen orria; robots.txt fitxategiak orrialdekatzea baztertzen du. |
| `emploi-territorial` | 10 | 64 departamenduko lehen 20 eskaintzetatik Iparralden kokapen baieztatua dutenak. |
| `ejie` | 5 | Lehen orria; robots.txt fitxategiak orrialdekatzea baztertzen du. |
| `tracasa` | 5 | Sitemap-ean argitaratutako JobPosting fitxak, Nafarroako kokapen esplizituarekin. |
| `uppa` | 1 | Bayonne edo Anglet campus esplizitua duten administrazioko eskaintzak. |
| `chcb` | 3 | Lehiaketen iragarkiak eta hautagaitza-dosierrak; baldintzak PDFan kontsultatzeko. |

Zenbakiak kontsulta jakin bateko emaitzak dira; ez dira erakunde guztien
estaldura osoaren adierazleak. Erakunde baten atariak ez badu eperik edo
gai-zerrendarik argitaratzen, ez da daturik asmatzen.

## Katalogoarekiko auditoria erreproduzigarria

```sh
npm run inventory:audit
```

Tokiko API publikoa irakurtzen du (`INVENTORY_API_ORIGIN` bidez alda daiteke),
eta 895 erregistroak katalogoko erakunde deitzaileekin alderatzen ditu.
Bestela, lehen argumentuan katalogoaren JSON fitxategia eman daiteke.
Emaitza `data/imports/inventory-audit/coverage.json` fitxategian gordetzen da.
`records-observed` egoerak bat datozen fitxak aurkitu direla bakarrik adierazten
du; `pending` egoerak ez du lanposturik ez dagoela frogatzen. Ez da egiaztatutako
integrazio oso gisa aurkezten.

Compose-n `SCRAPE_SOURCES: "all"` ezarri da konektore guztiak erabiltzeko.
Bilketa eskuz egitean aldagaia hutsik uzteak ere erregistro osoa hautatzen du;
komaz bereizitako IDek hautaketa mugatzen dute. Horrela konektore berri bat ez da Compose-ko zerrenda zahar batengatik
aktibatu gabe geratzen.

## Sarbide-mugak

NUPen atari nagusia eskuragarri dago, baina OPE zerrendaren `opcion=3`
eskaerak HTTP 403 itzuli du. `institutions.json` fitxategian `access-blocked`
gisa erregistratu da. Ez da sarbide-blokeoa saihestu.

Azken auditorian 2326 fitxa zeuden katalogoan. Inbentarioko 895 erregistroetatik 300ek gutxienez bat datorren fitxa zuten, eta 595ek ez zuten bat datorren fitxarik. Laburpena `coverage-summary.json` fitxategian dago. Kopuru horiek ez dute integrazio osoa frogatzen.

## 2026-11-18ko foru-erakundeen blokea

| Konektorea | Kontsultatutako fitxak | Muga nagusia |
| --- | ---: | --- |
| `ifas` | 7 | Indarreko deialdien taula publikoa eta plaza kopuruak. Ez da saioa hasi behar duten iragarki edo sailkapenetara sartzen. |
| `uliazpi` | 9 | Lan-eskaintzak eta lan-poltsak. Lekualdatzeak eta barneko lehiaketak kanpoan. Ez dira formularioetako egoera-tokenak gordetzen. |
| `lantik` | 20 | Atariaren zerrendan argitaratutako prozesuak, historikoak barne. Lan-poltsa aktiboa ez da izen-emate irekitzat hartzen. |

Lantiken identifikatutako oinarriak eta gai-zerrenden estekak gehitzen dira.
Ezezagunak diren titulazioak eta epeak ez dira lanpostuaren izenetik edo
argitalpen-datatik ondorioztatzen. IFASeko eta Bizkaiko taulen egitura
partekatua parser bakarrean dago, erakunde bakoitzaren nortasuna eta domeinua
mantenduta. Konektore berriak `SCRAPE_SOURCES=all` aukeran sartzen dira.

## 2026-11-18ko etxebizitza, fundazio eta ikerketa blokea

| Konektorea | Kontsultako fitxak | Baldintzak |
| --- | ---: | --- |
| `kabia` | 27 | Sede ofizialeko prozesuak, argitaratutako fasearekin. Behin betiko izendapenak itxita; barneko lekualdatzeak kanpoan. |
| `alokabide` | 98 | Atariak emandako deialdiak, historikoak barne. Deitzailea APIko erakundearekin egiaztatzen da. Izen-emate eta erreklamazio epeak bereizten dira. |
| `musikene` | 1 | Gutxieneko titulazioa, C1 euskera eta bi lanpostuak esplizituki argitaratuta. Urterik gabeko epea zehaztu gabe mantentzen da. |
| `biogipuzkoa` | 79 | BIOEF atariko OFERTAS BIOGIPUZKOA kategoria, azken urteko edo etorkizuneko itxierekin. Praktikak eta eskaintza baliogabetuak kanpoan. |

Alokabideren kontsultan 596 argitalpen eskuratu dira. Deialdiaren izenarekin
bat datozen oinarriak eta programak bakarrik lotzen dira, hautagaien eta
emaitzen zerrendak kanpoan utzita. Kontsulta 1.000 argitalpenetara mugatzen da;
muga betez gero, bilketak estaldura partziala jakinarazten du.

Biogipuzkoako fitxek oinarri ofizialetara eramaten dute, baina ez zaizkio BIOEF
deitzaileari esleitzen. Erakundearen egoitza ez da nahikoa lanpostuaren
probintzia baieztatzeko. Ez dira hautagaitzarako formularioak bidaltzen.

VISESAren ataria berrikusi da: eskaintzen scriptaren HTTP 200 erantzunak 0 byte
itzuli ditu kontsultan. BIOEFen atari nagusiak HTTP 403 itzuli du; eskuragarri
dagoen OFE artxibo zaharrak ez du 2025/2026ko eskaintzarik. Bi kasuak
`institutions.json` fitxategian dokumentatu dira, eskaintzarik ez dagoela
ondorioztatu gabe.

## Udal-direktorioak berritzea

```sh
npm run inventory:sync
npm run inventory:sync-iparralde -- /bidea/communes-64.json
```

Lehen komandoak Euskadiko tokiko entitateen erregistroko `Municipio` motako
sarrerak soilik erabiltzen ditu; ez ditu alkateen edo kontaktu pertsonalen
datuak gordetzen. Web-erreferentziak erregistroan argitaratutako balioak dira:
ez dute webgunearen edo enplegu-atalaren erabilgarritasuna baieztatzen.
Bigarrenak CAPBko communeak irakurtzen ditu, orrialdekatzea eta INSEE kodeak
egiaztatuta. Aurreko sarrerak ezin badira modu bakarrean parekatu, inbentarioa
ez da ordezkatzen. Kopia osatua atomikoki idazten da.

Direktorioaren egiaztapena ez da enplegu-iturriaren integrazio oso gisa
kontabilizatzen. Lurralde historikoen probintzia ez da Iparraldeko zerbitzu
administratibo baten izenetik ondorioztatzen.

64 departamenduko APIaren `robots.txt` fitxategiak `/api/` bidearen kontsulta
automatikoa baztertzen du. Horregatik, sareko sinkronizazioak muga hori
errespetatzen du eta ez du aurrera egiten. Iparraldeko egiaztapena datu publikoen
JSON kopiarekin egin da; kopia osoa lehen argumentuan eman daiteke, APIaren
`total_count/results` formatuan edo esportatutako erregistroen array gisa.
Ez da sareko sinkronizazio arrakastatsu gisa dokumentatzen.

## Udal-webguneak eta enplegu-atalak

Nafarroako Tokiko Entitateen Erregistroaren CSV kopiatik web-erreferentziak
gehitzeko:

```sh
python3 scripts/sync-navarra-websites.py /bidea/2025-municipios.csv
npm run inventory:discover -- --resume
```

CSV fitxategia [Nafarroako direktorio ofizialetik](https://datosabiertos.navarra.es/dataset/entidades-locales-de-navarra)
eskuratu behar da. 272 udal-kodeak egiaztatzen dira ezer idatzi aurretik.
Ez dira kontaktu pertsonalak gordetzen. 253 udal-webgune argitaratuta zeuden;
Euskadiko direktorioarekin batera, 501 web-erreferentzia berrikusi dira.

2026-11-18ko prospekzioak 99 webgunetan enpleguarekin lotutako esteka hautagaiak
aurkitu ditu; 212tan ez da estekarik identifikatu hasierako orrian, eta 190
ezin izan dira kontsultatu ezarritako sarbide eta denbora-mugekin. Emaitza osoa
`municipal-portals.json` fitxategian dago. Esteka hautagaiak ez dira automatikoki
deialdi gisa inportatzen. Estekarik ez aurkitzeak ez du eskaintzarik ez dagoela
esan nahi; erabilgarri ez dauden webguneak egiaztatzeko gelditzen dira.

Prospekzioak HTTPS helbide publikoak erabiltzen ditu, direktorioan agertutako
hosta eta haren `www` aldaera baimenduta. Birbideratze bakoitza eta `robots.txt`
egiaztatzen dira. Gehienez lau kontsulta paralelo egiten dira; webgune bakoitzak
20 segundoko aurrekontua du, `crawl-delay` itxaronaldiak barne. Hamar emaitzatik
behin aurrerapena gordetzen da. `--resume` aukerak azken 24 orduetako HTML cachea
berrerabiltzen du, jatorrizko kontsultaren data mantenduta.

| Udal-iturria | Kontsultako fitxak | Estaldura |
| --- | ---: | --- |
| `andoain` | 8 | Udal-zerrendako Gipuzkoako hautaketa-sedearen estekak, udal-kodea egiaztatuta. |
| `hernani` | 31 | Udal-zerrenda ordenatuko sedearen estekak; zerbitzu-eginkizunak kanpoan. |
| `zizurkil` | 3 | Udal-kodearekin bat datozen sedearen prozesuak. |
| `elgoibar` | 20 | Zerrendako prozesuak; barneko mugikortasuna kanpoan. |
| `hondarribia` | 6 | Udal-zerrendatik lotutako hautaketa-prozesuak. |
| `ibarra` | 6 | Udal-kodea egiaztatuta; barneko prozesuak kanpoan. |
| `orio` | 28 | Udal-zerrendako prozesuak, historikoak barne. |

Zazpi udal-iturriek parser bera erabiltzen dute, erakundearen nortasuna eta
Gipuzkoako sedeko udal-kodea konfigurazio esplizituan mantenduta:
`scripts/municipal-portals.ts`. Sede bereko domeinu baliokideek ez dute fitxa
bikoizturik sortzen iturri berean.

Ez da izen-emate irekirik ondorioztatzen zerrendan agertzeagatik. Baldintzak,
epeak eta gai-zerrendak sede ofizialean kontsultatzeko gelditzen dira. Irunen
xehetasun-fitxaren kontsulta `robots.txt` arauek baztertu dute.

## Emploi territorial: orrialde guztien irakurketa

64 departamenduko bilaketa publikoaren 105 emaitzak irakurri dira; horietatik
42 Iparraldeko commune batean kokatuta zeuden. Aurreko lehen orriko muga
gainditu da atariaren bilaketa anonimo orrialdekatua erabiliz. Cookieak
prozesuaren memorian soilik mantentzen dira; ez dira esportazioan edo cachean
gordetzen. Kopuru osoa eta esteka errepikatuak egiaztatzen dira, bilketa
osatugabea arrakastatsu gisa aurkeztu ez dadin. Béarnen dauden lanpostuak ez
dira sartzen. Horrek ez du erakundeen beste kontratazio-atari guztiak estaltzen.

## Iturri agregatuetan egiaztatutako erakundeak

Inbentarioko 20 erakundetan aurrez martxan zeuden iturrien benetako fitxak
aurkitu dira. Zuzeneko konektore berria egin beharrean, jatorria eta estaldura
partziala erregistratu dira:

| Iturria | Erakundeak |
| --- | --- |
| Euskadiko katalogo publikoa | Ente Vasco de la Energía, SPRI, NEIKER, IHOBE, Basquetour, IZFE eta Bidegi. |
| Lanbide eta Euskadiko katalogoa | Parlamento Vasco, Instituto Foral de la Juventud eta Centro de Cálculo de Álava; erakunde bakoitzaren iturri zehatzak `recordEvidence` eremuan. |
| Arabako aldundiaren ataria | Álava Agencia de Desarrollo; Gazteriaren Foru Erakundearen fitxak ere bai. |
| Nafarroako ataria | Nafarroako Foru Komunitateko Administrazioa, Osasunbidea eta Instituto de Salud Pública y Laboral de Navarra. |
| CPEN | Bidean, CNAI, NASUVINSA eta NICDO. |
| Euskadiko katalogo publikoa, Nafarroako fitxak | Sakanako Mankomunitatea. |

Erakunde horiek `aggregate-partial` gisa agertzen dira. Horrek ez du haien
deialdi guztiak edo gai-zerrenda guztiak eskuratu direla esan nahi.

[NEIKERen enplegu-atariak](https://neiker.eus/es/empleo/) IVAPen, Lanbiden eta
bere webgunean argitaratzen dituela azaltzen du. Zuzeneko orria ere berrikusi
da; hautagai-zerrendak dituzten ZIP fitxategiak ez dira inportatu.
[Itelazpiren atariak](https://www.itelazpi.eus/conocenos/ofertas-de-empleo/)
2026-11-18ko kontsultan ez zuen prozesu irekirik adierazten; 2025ean itxitako
prozesua ageri zen. Hasierako egiaztapenaren ondoren zuzeneko konektorea
gehitu da; ikus beheko integrazio-blokea.

## Nafarroako deialdiak Open Data Euskadi/IVAPen

Dataset ofizialak Nafarroako fitxak ere baditu, baina aurreko iragazkiak
Euskadiko metadatuak bakarrik onartzen zituen. Kokapen esplizitua erabiliz
Nafarroa ere hautatzen da orain; bi lurraldeen arteko metadatu kontraesankorrak
baztertu egiten dira. Ez da lanpostuaren izenetik probintziarik ondorioztatzen.

Kontsultan 164 fitxa eskuratu dira, akatsik gabe: 34k dokumentu ofizialetarako
estekak dituzte eta bost NUPekoak dira. NUPen zuzeneko OPE atalaren 403 muga
bere horretan mantentzen da; beste katalogo ofizialeko fitxak erabiltzeak ez du
atari propioaren estaldura osoa esan nahi. Udal-deialdien urtebeteko leihoa
Nafarroako udalei ere aplikatzen zaie. Gainerako erakundeen leihoa azken
90 egunekoa da, etorkizuneko epeak barne.

## Iparraldeko udal-webguneen direktorioa

```sh
npm run inventory:sync-iparralde-websites
INVENTORY_DISCOVERY_OUTPUT=data/imports/iparralde-discovery npm run inventory:discover -- --resume '--territory=País Vasco francés'
```

CAPBren sitemap ofizialetik inbentarioko 158 communeen fitxak modu bakarrean
parekatzen dira. Fitxa bakoitzaren izenburua egiaztatzen da eta `Site internet`
eremua bakarrik gordetzen da inbentarioan, kontaktu pertsonalak kopiatu gabe.
Kontsultan 69 web-erreferentzia aurkitu dira; gainerako 89 fitxek ez zuten
udal-webgunerik argitaratzen. 158 fitxen kontsulta zuzena izan da.

Direktorioaren bilaketa orrialdekatua eta DILAren APIa `robots.txt` arauek
mugatzen dituzte. Ez dira kontsultatu baimendu gabeko bideak. CAPBren sitemapak
eta udal-fitxa publikoek kontsulta baimentzen dute, eta horiek erabili dira.
Argitaratutako HTTP erreferentzia zaharretan HTTPS helbidea probatzen da
zuzenean; ez da zifratu gabeko eskaerarik edo HTTPra jaitsierarik egiten.

Hiru lurraldeetako azken prospekzio bateratuak 570 web-erreferentzia hartzen
ditu: 111tan esteka hautagaiak aurkitu dira, 253tan hasierako orrian ez da
identifikatu eta 206 ezin izan dira kontsultatu ezarritako mugekin. Iparraldeko
69 erreferentzietatik 12k dituzte hautagaiak, 41ek ez dute hasierako orrian
identifikatutako estekarik eta 16 ezin izan dira kontsultatu. Frantsesezko
«Offres d'emploi», «Emploi public» eta «Nous rejoindre» bezalako etiketak ere
identifikatzen dira. Kopuru horiek ez dira deialdi edo integrazio osoen kopuruak.

## Choisir le service public

`choisir-public` konektoreak Frantziako atari ofizialaren 64 departamenduko
orrialde guztiak irakurtzen ditu. Hautatutako iragazkiaren izena, guztizko
kopurua eta esteka errepikatuak egiaztatzen dira; bilketa osatugabea baztertu
egiten da. Kontsultan 229 eskaintza berrikusi eta Iparraldeko udalerri bateko
kokapen esplizitua zuten 52 fitxa eskuratu dira, gorabeherarik gabe.

Kokapena eskaintzaren `Localisation` eremutik hartzen da. Ez da nahikoa
erakundearen deskribapenean Bayonne edo Anglet aipatzea: adibidez, UPPAren
Pauko lanpostu bat ez da Iparraldekotzat hartzen. Atariaren JSON-LD eremuak
departamendua bakarrik adieraz dezake benetako helbidearen ordez; ez da hori
erabiltzen udalerria ondorioztatzeko. Béarn eta kokapen zehaztugabeak kanpoan
gelditzen dira.

Atariak batzuetan erakundearen mota bakarrik argitaratzen du deitzaile gisa
(adibidez, `Communes`). Izenburuan erakundea esplizituki agertzen bada,
argitaratutako izen hori erabiltzen da; ez da titulaziorik lanpostuaren izenetik
ondorioztatzen. Gutxieneko ikasketa-maila eta izen-ematearen azken eguna
argitaratuta daudenean gordetzen dira. Eskaintza guztiak ez dira azterketa eta
gai-zerrenda duten lehiaketak.

## Iparraldeko probintzia historikoak

```sh
npm run inventory:sync-iparralde-provinces
```

[Euskal Kultur Erakundearen sailkapena](https://www.eke.eus/fr/culture-basque/pays-basque/pays-basque-nord-ou-iparralde/communes-du-pays-basque-nord)
erabiliz, inbentarioko 156 commune sailkatu dira: 41 Lapurdin, 75 Nafarroa
Beherean eta 40 Zuberoan. Sailkapen historiko eta kulturala da; ez dira
Frantziako egungo probintzia administratiboak. Ez da CAPBren zerbitzu-unitateen
izenetatik ondorioztatzen.

`Les Aldudes` / `Aldudes` eta `Ibarolle` / `Ibarrolle` aldaerak izendegi
ofizialarekin parekatu dira. Iturrian ageri diren Esquiule eta Gestas ez dira
automatikoki gehitu CAPBren 158 udalerriko inbentariora. Lichos eta Sames ez
daude erabilitako sailkapenean; probintzia zehaztu gabe mantentzen dute.
Jatorria, kontsultaren data eta parekatzearen egoera udal-erregistroan gordetzen
dira.

Emploi territorial, CAPB eta Choisir le service public konektoreek sailkapen
partekatua erabiltzen dute, eskaintzan agertzen den benetako udalerritik abiatuta.
Atari bakoitzaren gainerako kokapen eta sarbide-mugak mantentzen dira.

## Miguel Servet Fundazioa, Gizain eta Itelazpi

| Konektorea | Kontsultako fitxak | Estaldura |
| --- | ---: | --- |
| `navarrabiomed` | 2 | Miguel Servet Fundazioak kudeatutako hautaketa-prozesuak, izen-emate datekin eta PDFko oinarriekin. |
| `gizain` | 15 | Sei iragarkitako SNE eskaintzak banan-banan; historikoak barne. |
| `itelazpi` | 1 | Orrian argitaratutako prozesu historiko itxia; kontsultan ez zegoen prozesu irekirik adierazita. |

Navarrabiomedeko bi eskaintzak irekita zeuden kontsultan. Batek Erizaintzako
unibertsitate-titulazioa eskatzen du; besteak Informatikako, Industriako edo
Telekomunikazioetako Ingeniaritza, edo antzekoa. Titulazioak gutxieneko
baldintzen ataletik ateratzen dira; merezimendu gisa aipatutako ikasketak ez
dira sarbide-titulazio bihurtzen. Ingelesezko B1 baldintza testuan mantentzen da,
euskararen edo frantsesaren egiaztapen gisa hartu gabe.

Gizainen albiste batek hainbat lanpostu izan ditzake. Eskaintza bakoitzak bere
identifikatzailea eta SNE esteka ditu, iragarkian agertutako etiketarekin.
Titulu profesionaletik ez da titulaziorik ondorioztatzen. Kontratuaren iraupena
eta izen-emate epea bereizten dira; eskuragarri ez dagoen epea zehaztu gabe
mantentzen da. Zuzendaritza Teknikoko eta administrazioko prozesuen oinarri
erabilgarriak egiaztatu dira. Hautagaien eta emaitzen zerrendak kanpoan daude.

Gizainen 652 eranskin zaharrak HTML itzuli du PDFaren ordez. Ez da dokumentu
baliozkotu gisa inportatu, eta iturriaren txostenean gorabehera agertzen da;
656 eta 724 oinarri erabilgarriak mantendu dira. SNEren `robots.txt` eskaerak
HTTP 500 itzuli zuen egiaztapenean; bertako inprimakiak kontsultatu gabe,
Gizainen argitaratutako estekak eta datuak erabiltzen dira.

Itelazpiren prozesu indardun eta bukatuak bereizten dira. Indarrean egoteak ez
du izen-ematea irekita dagoela baieztatzen, datarik argitaratu ezean.

Euskadiko Administrazio Autonomikoaren beste dataset ofizial bat ere berrikusi
da (`empleo_publico_ope/opendata/ofertas.json`): bost erregistro ditu,
2008–2018ko epeekin. Ez da gaur egungo Gobernuko bilatzailearen orrialdekatzea
ordezkatzeko iturri osatutzat hartu.


### Nafarroako erakundeak eta udal-egoitzaren hedapena, 2026-11-18

Parlamento de Navarra: 2026ko eta 2025eko sarbide publikoko sei prozesu.
Azaroaren 12ko bibliotekako aldi baterako zerrendak abenduaren 2ra arteko
eskaera-epea du; ofizial teknikoaren eta letratuen zerrenden hautaketa-prozesuak
martxan daude. Oinarri ofizialetako gai-zerrendak eta akademia-baldintzak
ateratzen dira. Ez dira hautagaien zerrendak deskargatzen; barne-mugikortasuna,
txanda murriztua eta funtzionarioen prestakuntza kanpoan uzten dira.

Miguel Induráin Fundazioaren albiste instituzionalen sei orrialdeak berrikusita,
kontratazio-iragarki bat aurkitu da. Sei hilabeteko kontratua ez da izena emateko
epea. Euskara C1 merezimendua da iragarki honetan, ez derrigorrezko baldintza.
Baluarteren hautaketa-atalean prozesu irekirik ez dagoela dioen mezua dago;
konektoreak atal hori egiaztatzen du, gainerako gardentasun-dokumentuak nahastu gabe.

| Udala | Fitxak |
| --- | ---: |
| Alkiza | 3 |
| Arama | 0, hautaketa-egoitzaren enplegu-modulua hutsik |
| Asteasu | 7 |
| Berastegi | 7 |
| Berrobi | 5 |
| Irura | 8 |
| Lizartza | 1 |
| Mendaro | 3 |
| Pasaia | 3 |
| Villabona | 1 |
| Amezketa | 1 |
| Ikaztegieta | 1 |
| Urretxu | 4 |

44 udal-fitxa gehitu dira bloke honetan. Web ofizialak argitaratutako
Gipuzkoako egoitzaren esteka eta udal-kodea egiaztatzen dira; ez da kodea
asmatu edo beste udal baten zerrenda inportatzen. Zerrendak ez du eskaera-epea
baieztatzen. Aramaren modulu hutsak ez du bestelako kanaletako eskaintzarik eza
frogatzen. Gainerako udal-webetako formatu desberdinek berrikuspena behar dute.

Naturklimaren web ofizialak Gipuzkoa Irekiako enplegu publikoko atalera eramaten
du; atalaren xehetasun-esteka robots.txt bidez baztertuta dago. Inbentarioan
`access-blocked` gisa jasota dago, eskaintzarik ez duela esan gabe.

HTTP irakurleak robots.txt-ren birbideratzeetan zuen errekurtsioa zuzendu da:
arauen deskarga mugatutako birbideratzeekin egiten da, eta edukien helmugen
arauak egiaztatzen jarraitzen da. Probek kanpoko helmuga debekatuak eta
birbideratze-begiztak ere hartzen dituzte. [RFC 9309, 2.3.1.2](https://www.rfc-editor.org/rfc/rfc9309.html#section-2.3.1.2).


### Udal-orriak eta osasuneko erakundeak, 2026-11-19

| Iturria | Fitxak | Egiaztapenaren muga |
| --- | ---: | --- |
| Leioa | 6 | Banakako fitxak; barne-prozesuak kanpoan. |
| Berrioplano / Berriobeiti | 8 | Prozesu bakoitzaren oinarriak eta zuzenketak; 3 PDF eskaneaturen eremuak berrikusteko. |
| Orkoien | 15 | Enplegu-moduluaren bi orrialdeak; modulutik kanpoko albisteak ez daude automatikoki estalita. |
| Mañeru | 2 | Azken urteko enplegu-bilaketa; bi bando eskaneatu bisualki irakurrita. |
| Osatek | 6 | Lanpostuen sei baimen eta dagozkien oinarriak; OPE 2022ko beste atala integratzeko. |
| La Sécu recrute | 6 | Nouvelle Aquitaineko 106 emaitza egiaztatuta; 5 Bayonnen eta 1 Angelun. |

Leioako kulturako lanpostuaren 90 gaiak, Orkoiengo berdintasuneko lanpostuaren
48 gaiak eta Osatekeko zerbitzu orokorren jefaturaren 7 gaiak identifikatu dira.
PDFko lerro-hausturek testu laburtua ekar dezakete; dokumentu ofizial osoaren
esteka gordetzen da. Kontserbatorioko gitarra-espezialitateko «Grado Medio» ez
da FP erdi-maila gisa sailkatzen.

Mañerun, SNEn aldez aurretik inskribatuta egoteko baldintza eta CVa aurkezteko
epea bereizten dira. Eskaneoen URL eta SHA-256 egiaztatu behar dira berrikusitako
datuak berrerabiltzeko. 2025eko karpetan dagoen barrenderoaren PDFak 2026ko
sinadura eta epeak ditu: karpetaren izena ez da deialdiaren urtea.

Osatekeko 2026ko erradiologiako irekierak abenduaren 31ra arteko epea ezartzen
du; titulazioa eta erradiodiagnostikoko espezialitatea eskatzen dira. 2016ko
jatorrizko oinarrien titulazio-data ez da 2026ko irekierari itsu-itsuan aplikatzen.
Manipulatzailearen oinarrietako erizaintza eta euskara merezimenduak ez dira
gutxieneko baldintza bihurtzen. La Sécu recrute-ko Bac+2 ez da Bac arrunt batera
murrizten; Bac gehi esperientzia alternatiba espresua denean soilik jasotzen da.
Frantziako medikuntzako diploma espresuaren ikasketa-arloa jasotzeak ez du
atzerriko tituluen homologazioa edo lanbidean jarduteko baimena frogatzen.

Udal-webetako bigarren pasaldiak 570 web erreferentzia aztertu ditu:
112 hautagai, 260 estekarik aurkitu gabe eta 198 ezin irakurri. Aurretik huts
zuten 8 web erantzuten hasi dira. Hautagai diren 112 udalerrien enplegu-orriak
berrikusita daude `employmentPageReview` eremuan; formatu askok oraindik
konektore espezifikoa behar dute. Berrikusita egoteak ez du integrazio osoa edo
lan-eskaintzarik eza esan nahi. Inbentarioan 29 udal-konektore zuzen daude,
estaldura partzialarekin; Vitoria-Gasteiz eta Donostiako aurreko konektoreak ere
zuzen lotuta geratu dira.

Haurreskolaken web nagusiaren eta Openet atariaren TLS/konexio-arazoak
`access-blocked` gisa erregistratu dira. Saint-Pierre-d’Irubeko REST APIa
robots.txt-k baztertzen du; ez da debeku hori saihestu. HTML publikoaren
formatua eta bestelako kanalak berrikusteko daude.

HTTP irakurlearen `crawl-delay` araua jatorri bakoitzari aplikatzen zaio.
Zerbitzari baten 10 segundoko itxaronaldia ez zaie beste erakundeei hedatzen;
probek iturri bakoitzaren arauak errespetatzen direla egiaztatzen dute.


### Erakundeen direktorio ofizialak eta ikerketa, 2026-11-19

Euskalmeteko lau prozesu eta NEIKEReko hogei prozesu kodetu gehitu dira.
Euskalmeteko adituen prozesua aktiboen atalean agertzen bada ere, azaroaren
12ko epe esplizitua amaituta dago; katalogoan itxita dago. Euskarako eta
ingeleseko B2 baldintzak oinarrietatik irakurri dira. NEIKEReko alegazioen
epeak ez dira eskaerak aurkezteko epetzat hartzen; hautagaien edo emaitzen
zerrendatzat etiketatutako ZIPak ez dira deskargatzen edo oinarri gisa aurkezten.
Baldintzen eta gai-zerrendaren erauzketa osatu gabe dago iturri horretan.

[CAEko sektore publikoaren direktorio ofizialean](https://opendata.euskadi.eus/sector-publico-de-la-comunidad-autonoma-de-euskadi-y-entidades-participadas/webopd00-dataset/es/)
454 erregistro aztertu dira, inbentarioko 213 erakundeen web-erreferentziak
kontrastatzeko. 53 web baieztatu dira direktorioko erakundearen izenarekin eta
«Sitio Web» eremuarekin. Ez dira telefonoak, helbide pertsonalak edo sailkapen
juridikoak inportatu. EuskoTren eta Euskotren Participaciones bereizita
mantentzen dira: bat-etortze anbiguoak berrikusteko uzten dira.

CPENen direktorioak konexio-timeoutak izan ditu bigarren kontsultan. CEIN,
NASERTIC eta OREKANen hiru web-erreferentziak lehenago benetan eskuratutako
ficha ofizialetatik gehitu dira, unea eta orriaren hash-a gordeta. Horrek ez du
CPENen web nagusiaren zuzeneko sinkronizazio berria arrakastatsua izan dela
esan nahi. Guztira 56 erakunde-web aztertu dira: 13 hautagai, 25 estekarik
aurkitu gabe eta 18 ezin irakurri. Hautagai batzuk dagoeneko integratutako
kanalak dira; CRLren Empleo orriak oraingo plantillari buruzko informazioa du,
ez identifikatutako deialdi-zerrendarik.

`institution-websites.json` eta `institution-employment-portals.json`
fitxategiek ebidentzia eta mugak gordetzen dituzte. Hauek web- eta kanal-
erreferentziak dira, ez lanpostu berrien edo estaldura osoaren froga.
Tresnak proiektuaren ostalarian exekutatzen dira:

```sh
npm run inventory:sync-institutions
npm run inventory:discover-institutions
```

Bilketa-zerbitzuko konektoreek ez dute automatikoki edozein esteka hautagai
inportatzen; benetako formatua eta erakunde arduraduna egiaztatu behar dira.


### Arkaute eta Nafarroako udal-katalogoak, 2026-11-19

Arkauteko hiru fitxa publiko natibo gehitu dira. Open Data indizean lurraldea
hutsik egoteak ez du Euskadiko prozesua baztertzen, baldin eta argitaratutako
esparruak edo polizia-legeko eginkizunek Euskadi baieztatzen badute. Ez da
kokapena egoitza sozialetik ondorioztatzen. Erakunde-atariaren marka erabili
ordez, lanpostuaren benetako eremua erabiltzen da izenburu gisa.

- 2025eko Ertzaintzako 150 plaza: [handitze-ebazpenak](https://arkauteakademiamuseoa.euskadi.eus/contenidos/empleo_publico/ope_2025_avpe_ertzaintza/es_def/Resolucion-de-ampliacion-de-plazas.pdf)
  177 gehiago ezarri zituen; guztira 327. Eskaeren epea 2025-12-23an amaitu zen.
  Jatorrizko oinarrien PDFaren testu-kodetzea irakurtezina da erauzketan;
  dokumentua lotuta dago, baina ez da gai-zerrenda berreskuratutzat ematen.
- Bitarteko udaltzainen 2026ko poltsa: 44 gai eta 2026-02-04ko epe amaitua.
  Euskara merezimendua da oinarrietan, ez sarbiderako C1/B2 baldintza orokorra.
  Berrikuspena PDFaren URL eta SHA-256rekin eta fitxaren baldintzen hash-arekin
  lotuta dago: testuingurua aldatuz gero, ez da berrerabiltzen.
- Zazpigarren deialdi bateratua: 593 plaza (430 Ertzaintza eta 163 udaltzaingo),
  54 gai, 2026-11-26ko epea. Ez da nahasten titulu zaharrean 225 plaza dioen
  zabalkunde-fitxarekin. PLak eta prezeptibitate mistoa ez dira CEFR baldintza
  bakar bihurtzen hautagai guztientzat.

[Baztango udal-katalogotik](https://www.baztan.eus/enplegu-publikoa/)
bi prozesu gehitu dira, bakoitza BONeko 21 gairekin eta C1 derrigorrezkoarekin.
Kirol-zientzietako eta Zuzenbideko titulazioaren testuak euskarazko oinarrietatik
hartu dira, ez lanpostuaren izenetik. Epe erlatiboak ez dira kalkulatzen.
Bukatutako prozesuen kanpoko artxiboa ez da biltzen.

[Estella-Lizarrako udal-katalogotik](https://www.estella-lizarra.com/actualidad/empleo-publico/)
12 prozesu gehitu dira, egungo orrialdeko irekiak eta itxiak barne. Lekualdatzeak
kanpoan utzi dira. Sei gai-zerrenda berreskuratu dira (13, 13, 10, 13, 23 eta
11 gai). Bost fitxatan ez dago positiboki identifikatutako oinarrien estekarik;
baldintzak eta programa baieztatzeke mantentzen dira. E.S.O. puntu bidez
idatzitako titulazioa ere onartzen du orain erauzketak.

Gipuzkoako beste 36 hautagai-orrietan egoitza bateratuaren estekak bilatu dira:
33 orri irakurri dira baina ez dute formatu horretako esteka ezagunik; hiru
kontsulta ezin izan dira osatu. `selectionSeatReview` eremuak froga gordetzen
du. Horrek ez ditu orri horien berezko formatuak integratutzat ematen, ezta
lan-eskaintzarik ez dagoela ondorioztatzen ere. Andosillako lehen esteka
lan-eskaintza pribatuen eta ikastaroen taula da; ez da udalaren enplegu publikoko
katalogotzat inportatzen.


### Nafarroako direktorioen eta enplegu-iturrien hedapena, 2026-11-20

[Gobierno Abiertoko sektore publikoaren zerrenda](https://gobiernoabierto.navarra.es/es/transparencia/sector-publico-foral),
[sozietate publikoak](https://gobiernoabierto.navarra.es/es/transparencia/sociedades-publicas),
[fundazioak](https://gobiernoabierto.navarra.es/es/transparencia/fundaciones-consorcios)
eta [organismo autonomoak](https://gobiernoabierto.navarra.es/es/transparencia/organismos-autonomos)
berriro kontsultatu dira. Inbentarioko 49 erakunde navarretatik 39ren web-
erreferentziak lotu dira izen argitaratuarekin. BIDEAN eta Nafarbideren
errenkadek ez dute web-estekarik ematen; horrek ez du esan nahi webgunerik ez
dutenik. Aurreko CPEN timeouten txostena historikoa da; oraingo ebidentzia
`navarra-institution-websites.json` fitxategian dago.

Beste zazpi mankomunitateren webak aurretik benetan deskargatutako REELL CSV
ofizialetik lotu dira. `navarra-mancomunidad-websites.json` fitxategiak snapshotaren
unea eta SHA-256 gordetzen ditu. Ez da gaur zuzeneko deskarga berri bat egin
dela esaten. Erakundeen 99 web-erreferentzia daude orain: 53 Euskadin eta 46
Nafarroan. Horien prospekzioan 25 enplegu-esteka hautagai, 49 estekarik aurkitu
gabe eta 25 ezin irakurri daude. Erakunde bakoitzaren egiaztapen-data mantentzen
da; cachea berrerabiltzea ez da kontsulta fresko gisa aurkezten.

```sh
npm run inventory:sync-navarra-institutions
python3 scripts/sync-navarra-mancomunidades.py /bidea/entidades-locales.csv
npm run inventory:discover-institutions -- --territory=Navarra --resume
```

[Cámara de Comptos](https://camaradecomptos.navarra.es/es/transparencia/empleo-publico):
2026ko eta 2025eko bi deialdi publiko, BONeko 26 eta 73 gairekin. Lehenengoa
NUPekin batera deitua da; ez dira plaza guztiak erakunde bakarrari egozten.
CMSaren errenkada bereko dokumentu-estekek baieztatzen dute 2025eko prozesua
itxita dagoela. Titulazio juridiko orokorra ez da Arkitekturako espezialitate
bihurtzen, eta epe erlatiboak ez dira kalkulatzen.

[SCPSA / MCP](https://www.mcp.es/ofertas-de-empleo): oraingo zerrendako hamabi
prozesu. Deitzailea Servicios de la Comarca de Pamplona, S.A. da, ez guraso-
erakundea izen bera balu bezala. Hamar PDFetan gaitasun teknikoen zerrenda
argitaratzen da, Temario parekotzat emana: 110 sarrera berreskuratu dira.
Fase kanpoko aurkezpen-epe absolutuak erabiltzen dira, ez webeko erakusketa-
datak. Kalitate-kontroleko prozesuak 2026-11-18ko epea du PDFan, webak abendura
arteko erakusketa erakutsi arren; katalogoan itxita dago. Curriculumak,
hautagaien zerrendak eta eskaera-formularioak ez dira deskargatzen edo bidaltzen.


[BON: Nafarroako toki-administrazioaren 2.1 atala](https://bon.navarra.es/es/indice-boletines):
argitaratutako aurkibide eta hilabeteko esteketatik azken 90 egunetako
67 boletin irakurri dira. 36 erakunde iragarleren 56 deialdi-fitxa berreskuratu
dira, 37 gai-zerrendarekin. Izendapenak, emaitzak eta barneko prozesuak
ez dira deialdi berri gisa sartzen. 23 fitxatan titulazioa egiaztatzeko
abisua mantentzen da; ez dira epe erlatiboak kalkulatzen edo prozesu mistoetako
hizkuntza-profilak plaza guztietara zabaltzen. Udalerrietako eta zazpi
mankomunitateetako `aggregateMonitoring` eremuak boletinaren jarraipen mugatua
adierazten du; ez du zuzeneko udal-atariaren estaldura osoa frogatzen.

Gizarte Hezkuntza, Politika Zientziak eta Soziologia unibertsitateko
azpiaukerak gehitu dira hiru hizkuntzetan. Graduado Escolar tituluaren
ondorio profesionalak ESOren parekoak direla jasotzen du
[LOEren 31. xedapen gehigarriak](https://www.boe.es/buscar/act.php?id=BOE-A-2006-7899);
Certificado de Escolaridad ez da automatikoki baliokidetzat hartzen.


[Mairaga](https://mairaga.es/) mankomunitateko azken 365 egunetako
kontratazio-albisteetatik bi jatorrizko prozesu eta haien oinarriak irakurtzen
dira: Ekonomia/Enpresen Administrazioko zerrenda, 14 gai osorekin, eta
txoferraren hiru plazako prozesua. C gidabaimena eta indarreko CAP baldintza
bereiziak dira. Barneko txandak eta emaitzen albisteak ez dira deialdi berriak;
txoferraren oinarrietan ez da identifikatutako gai-zerrendarik gehitzen.


[Riberako mankomunitatearen taulan](https://mancoribera.com/tablon-de-anuncios/)
argitaratutako SERINSAren 2024ko bi prozesu berreskuratzen dira: administraria,
11 gaiko programarekin, eta zaintzaileen zerrenda, 6 gairekin eta B gidabaimenarekin.
Oinarriek Servicios Públicos de la Ribera, S.A.U. (SERINSA) enplegatzailea
baieztatzen dute; ez da mankomunitate argitaratzailea enplegatzailetzat
automatikoki hartzen. Hautagaien PDFak eta eskaera-ereduak ez dira
deskargatzen. Deialdi historikoak ez dira izen-emate ireki gisa erakusten.


Euskadiko 120 erakundeen direktorio-berrikuspen osoa
`euskadi-institution-websites.json` fitxategian dago: 53 web egiaztatuta,
2 argitaratu gabe, 2 berrikusteko eta 63 bat-etortze argirik gabe. Aukerak
eta Zumaiako Kirol Portuaren direktorio-erreferentziek ez dute weba argitaratzen;
horrek ez du erakundeen jarduera edo eskaintzen egoera zehazten.

```sh
INVENTORY_TERRITORY=Euskadi npm run inventory:sync-institutions
```

Consejo de Relaciones Laborales erakundearen enplegu-orria egungo
plantillaren deskribapena da; ez da plantilla hori deialdi bihurtzen.
Région Nouvelle-Aquitaine-ren orri ofizialak lotutako kontratazio-atariak
bilketa ukatu du `robots.txt` bidez. EPFL eta Office de Tourisme Pays Basque
erakundeen web-identitateak egiaztatu dira; hasierako orrian lan-estekarik
ez aurkitzeak ez du eskaintzarik ez dagoela frogatzen.
EPFL Pays Basqueren 2025eko lan-iragarkien bilatzaile-emaitzak egiaztatu dira
2026-11-23an, baina esteka ofizial horiek HTTP 404 itzultzen dute egun; ez dira
deialdi berritzat inportatu.
SCoT Pays Basque et Seignanx sindikatuaren enplegu-orri ofiziala ere aztertu da;
argitaratutako eskaintzaren izen-ematea 2019-05-20an amaitu zen. Ez da egungo
deialdi gisa gehitu.


Arabako enplegu-atariaren zerrenda argitaratuen orrialde guztiak irakurtzen
dira, azken 180 egunetako iragarki datatuetarako. Identifikatutako oinarrien
PDFak egiaztatzen dira: Gazteriaren Foru Erakundearen deialdiko anexo
espezifikoak Batxilergoa edo erdi/goi-mailako LH onartzen du, eta 40 gaiko
programa berreskuratu da. Samaniegoko zerrendak eskolatze-ziurtagiria eta B
gidabaimena eskatzen ditu; euskera meritu da, derrigortasunik gabekoa.
Eskolatze-ziurtagiria ez da ESO bihurtzen. Data gabeko OPE-moduluak eta
identitate idatzia ezin egiaztatu den dokumentuak berrikusteko mantentzen dira.


Euskadiko katalogoan lurralderik gabe zeuden 114 fitxa berrikusi dira.
39 fitxa berreskuratu dira: 22 Euskadin, fitxako eremu geografiko esplizituarekin,
eta 17 Nafarroako udaletan, udalerriaren nortasun ofiziala eta BONeko
erreferentzia batera egiaztatuta. Egoitza edo koordenatu instituzionalak
ez dira lanpostuaren probintzia bihurtzen. Arkaute-ren kopia zaharkitua
berariazko konektorearen jatorrizko oinarrien bidez kudeatzen da.
Gainerako eremu zabalek edo baieztatu gabekoek ez dute helburuko lurraldea
frogatzen; ez dira eskaintzarik ezaren frogatzat hartzen. Xehetasunak
`docs/inventory/euskadi-scope-review.json` fitxategian daude.


Nafarroako Arartekoaren langileen atala ere integratuta dago (`defensor-navarra`).
Argitaratutako administrariaren prozesua historiko itxia da: 2023-01-11ko
epea, Batxilergoa edo LH II eta Parlamentuko funtzionario-lotura, Arartekoaren
bulegoan. Oinarrien PDFa egiaztatzen da; merezimendu-lehiaketa horretan ez
da oposizioko gaitegirik asmatu. INTIAren gardentasun-orriak CPENeko enplegu
atarira zuzenean lotzen du; NILSAren estekak informazio korporatiboa baino
ez du egiaztatzen. Sodena-ren egungo gardentasun-orria berrikusi da,
direktorioko bide zaharrak 404 eman ondoren. Froga:
`docs/inventory/navarra-employment-page-reviews.json`.

IVAPen aurretik gordetako 13 fitxen izenburuak eta erakundeak zuzendu dira,
nabigazio-menuko izenburuaren ordez fitxa ofizialeko eremuak erabilita.
Erregistroen IDak mantendu dira. Uneko lehen orriko 5 fitxak eta aurreko
8 fitxak bereizita berrikusi dira; orrialdekatze debekatua ez da saihestu.
Xehetasunak `docs/inventory/ivap-identity-review.json` fitxategian daude.


HAZIren atari propioa gehitu da (`hazi`): kanpoko hiru kontratu mugagabeko
deialdi, hiru profil eta bi egutegi PDF egiaztatuta. Idatzizko probaren
5/3/4 ezagutza-blokeak berreskuratzen dira, merezimenduetatik bereizita.
Hirurek C1 euskera eta B gidabaimena eskatzen dituzte; Markak eta Merkatuak
postuak C1 ingelesa ere eskatzen du. Prestakuntzako postuaren titulazio
sektoriala bere horretan mantentzen da, edozein gradu onartzen dela asmatu
gabe. Donostia, Abadiño eta Arkaute destino posibleak dira; hasierako egoitza
ez da probintzia bakar bihurtzen. Postu juridikoan oinarriek 2026-11-20 eta
egutegiak 2026-11-19 adierazten dute: epea baieztatzeko dago. Hautagaien
zerrendak eta kanpoko eskaera-formularioak ez dira deskargatzen.


Anglet Tourisme erakundearen bi kontratazio historiko gehitu dira
(`anglet-tourisme`): biak itxita daude, 2025-08-22ko epearekin eta
Angleteko destinoarekin. Eskaneatutako PDF ofizialak bisualki berrikusi
eta SHA-256 bidez lotu dira. Ez da titulu akademikorik edo azterketa-gaitegirik
asmatzen. SDIS 64ren sei iragarkiak ere berrikusi dira; irakurritako
postuek ez dute Iparraldeko destinoa egiaztatzen.


Tafallako udalaren deialdi-atari propioa gehitu da (`tafalla`). 2026-11-23an
bost orri publikoak eta banakako fitxak kontsultatu dira: oinarri ofizialak
dituzten 26 prozesu, horietatik 18 itxita, 6 ebazpen bidean eta 2 epea
baieztatzeko. Barne-sustapena, lekualdatzeak eta hautagaien emaitzak kanpoan
geratu dira. Beste hiru fitxatan ez da oinarririk identifikatu; ez dira
inportatu. Percusión eta Saxofón irakasleen oinarriak PDFaren SHA-256arekin
egiaztatu dira: musika-espezialitateko titulazio-bideak testu literalean
gordetzen dira, gradu orokor batekin parekatu gabe. Udal-atariak biak
«Abierta» gisa etiketatzen ditu, baina ez du epe absolutua ematen; ezin da
etiketa hori gaurko izen-emate ireki gisa baieztatu. Oinarrietan BONeko
argitalpenetik hogei egun naturaleko epea dago, baina konektoreak ez du
epe erlatibotik data automatikoa asmatzen. Anexoari buruzko aipamen hutsa
ez da gaitegi oso bihurtzen.


Barañaingo udalaren enplegu-artxiboa gehitu da (`baranain`): sei orriak
kontsultatu, 2025etik aurrerako udal-oinarriak dituzten zortzi prozesu
eta oinarrien eranskinetatik 151 gai berreskuratu dira. Hirutan ez dira
udal-oinarriak identifikatu; ez dira inportatu. Barneko igoerak,
lekualdatzeak, emaitzak eta hautagaien agiriak kanpoan geratzen dira.
Informatikako eta kirol-koordinazioko deialdiek gradu orokorra onartzen
dute; Lan Harremanetako titulu espezifikoa bere testuan gordetzen da,
gradu orokorrari sarbidea eman gabe. Hainbat plazako administrazio-deialdian
euskara B2 duten eta ez duten postuak batera agertzen dira; hizkuntza-baldintza
ez zaio deialdi osoari ezartzen. Epe absolutu egiaztaturik gabe, prozesuak
ez dira izen-emate irekitzat aurkezten. 2025 baino lehenagoko artxiboa
eta kanpoko egoitza elektronikoak ez daude konektorearen estalduran.

Altsasuko udalaren enplegu-orriak egoitza elektronikora bidaltzen du;
egoitza horretako `robots.txt` arauak ez du fitxa automatizaturik onartzen.
2026-11-12ko udal-albisteak haur-hezkuntzako hezitzailearen deialdia eta
2026-11-25eko epea egiaztatzen ditu. Deialdia BONeko `bon-local` iturrian
jasota zegoen; ez da bikoiztu. Udal-atariaren estaldura oraindik partziala da.

Villava/Atarrabiako udalaren deialdi-artxiboko bi orriak gehitu dira
(`villava`). Hamabost fitxa berrikusi dira: zazpik BONeko edo udaleko
jatorrizko oinarrietarako esteka dute, eta haietatik 141 gai atera dira.
Barne-sustapeneko deialdia baztertu da; beste zazpi fitxek ez dute
jatorrizko oinarrien dokumentu-esteka zuzena eta eskuzko berrikuspena
behar dute. «Abierta» etiketa duten prozesuak ez dira izen-emate
irekitzat jotzen epe absolutua egiaztatu gabe. Kirol Martiket enpresa
publikoaren deialdian kontratazio-erakundea bereizita gordetzen da.

## Euskadiko Orkestra

[Euskadiko Orkestraren enplegu-orriko](https://es.euskadikoorkestra.eus/orquesta/trabajar-en-la-orquesta)
hiru instrumentista-audizioak eta haien oinarri PDFak egiaztatu dira
2026-11-24an. `orkestra` konektoreak kontrabaxu bakarlaria (itxia), hiru
biolin tutti (izena emateko azken eguna 2026-11-26) eta fagot bakarlaria
(2026-11-25) jasotzen ditu. Oinarrietan «antes del» agertzen denean,
aurreko eguna gordetzen da azken egun gisa. Atariak erakusten duen data
audizioarena da; ez da izen-ematearen epea. Titulu Gorena edo baliokidea
hitzez hitz gordetzen da, tribunalak salbuespenez titulurik gabeko
hautagaiak onar ditzakeela adierazita. PDF berak ariketak eta errepertorioa
jasotzen ditu; ez da gai-zerrenda akademikorik asmatzen. Hautagaien
zerrendak eta audizio-aktak ez dira deskargatzen. Estaldura egungo
lan-eskaintzen orrira mugatzen da, ez artxibo historiko osora.

CEINen hiru eta NILSAren fitxa bat ere CPENeko iturri agregatuan aurkitu dira
azken auditorian. Inbentarioan `aggregate-partial` gisa markatu dira:
fitxa horiek benetako erakunde deitzailearekin lotuta daude, baina ez dute
erakunde horien enplegu-eskaintza guztiak estaltzen direla frogatzen.

## Unibasq

[Unibasqen gardentasun-atariko](https://www.unibasq.eus/es/portal-de-transparencia/portal-de-transparencia-ofertas/)
lau prozesu itxiak eta oinarri PDFak irakurri dira 2026-11-24an:
ebaluazioko teknikarien aldi baterako poltsa (2024), bi plaza finkatzeko
merezimendu-lehiaketa (2023), administrari laguntzailearen aldi baterako
postua (2019) eta nazioarteko arloko postua (PDFan 2017ko epea).
Azken PDF horren URLak `2023/09` adierazten badu ere, oinarrietan bertan
2017-08-16ko epea dago; ez da 2023ko deialditzat aurkezten. Titulazio,
hizkuntza-eskakizun eta izen-emate epe esplizituak gordetzen dira.
Hautagaien zerrendak, merezimenduen ebazpenak eta beste emaitza-agiriak
ez dira deskargatzen. Lau prozesuek ez dute oposizioko gai-zerrendarik;
ez da asmatzen. Atariak ez du artxibo historiko osoa bermatzen.

## URA · Uraren Euskal Agentzia

[URAren lan-prozesu indarrekoen orriak](https://www.uragentzia.euskadi.eus/empleo-procesos-vigentes-ura/webura00-contents/es/)
bi prozesu erakusten ditu 2026-11-24an. Zuzendaritza eta Plangintza eta
Obren arloko zuzendari-postuaren DOCX iragarki ofizialetik Vitoria-Gasteizko
destinoa, eskatutako titulazioaren alternatibak, bost urteko esperientzia
eta hizkuntza-baldintzak jaso dira. Iragarkiak ez du izena emateko azken
egun absoluturik ematen; egoera `Pendiente de confirmar` da, orriak
«vigentes» esan arren. Ez dago oposizioko gai-zerrendarik argitaratuta.
Administrari orokorraren beste prozesua desgaitasuna duten pertsonentzako
turnu murriztua da, eta bilaketa orokorretik kanpo utzi da. Konektore
honek ez du prozesu amaituen artxiboa edo kanpoko hautagaitza-ataria
osorik estaltzen.

## Herri Kontuen Euskal Epaitegia (TVCP)

[Hautaketa-prozesuen atarian](https://hkee-tvcp.eus/portal-de-transparencia/informacion-sobre-procesos-selectivos/)
argitaratutako 2026-0053, 2026-0054 eta 2026-0055 ebazpenen PDF ofizialak
egiaztatu dira 2026-11-24an. Administrazio orokorreko teknikaria, informatika
teknikaria eta administraria hautatzeko hiru lan-poltsa dira. Oinarrietan
Vitoria-Gasteizko destinoa, titulu-baldintzak eta 2026-08-11ko izen-emate
itxiera ageri dira. Euskara derrigorrezko profila duten eta ez duten poltsak
bereizten dira; ez da hizkuntza-eskakizun bakarra ezartzen fitxa osoari.
Merezimendu-lehiaketak dira, azterketako gai-zerrendarik gabe. Ez dira
hautagaien zerrendak edo emaitzen agiriak inportatzen. Ebazpen berriak eskuz
berrikusi behar dira.

## Ararteko

[Arartekoaren hautaketa-prozesuen artxiboko](https://transparencia.ararteko.eus/es/procesos-selectivos)
2024ko eta 2023ko hiru ebazpenen BOPVko PDFak egiaztatu dira. Bi
arlo-teknikari, hezkuntza-arloko teknikari arduradun bat eta kontratazio
publikoaren eta kontabilitatearen arloko teknikari arduradun bat hautatzeko
prozesuak dira. Langile eventualentzako egokitasun eta merezimendu balorazioa
da; ez dago oposizioko gai-zerrendarik. Zuzenbideko edo Ekonomiako
titulazio-alternatibak, esperientzia eta nahitaezko C1 euskara ageri dira
fitxetan. Oinarrietan 15 egun balioduneko epe erlatiboa dago; ez da amaiera
egun absoluturik kalkulatzen. 2018–2022ko artxiboko prozesuak eta ebazpen
berriak hurrengo berrikuspenetarako geratzen dira.

## Etxepare Euskal Institutua

[2024ko hiru lanpostuen albiste ofizialak](https://www.etxepare.eus/eu/hiru-lanpostu-hautatzeko-prozedura-2024)
komunikazio digitaleko teknikaria, sistema-teknikaria eta administrari
laguntzailea iragarri zituen. Fitxa bakoitza eta EHAAko oinarri espezifikoen
HTMLa egiaztatu dira. Hirurak txanda irekiko oposizio-lehiaketak dira,
Donostian, plaza banarekin; izena emateko azken eguna 2024-01-18 izan zen.
Titulazioak, euskarako hizkuntza-eskakizuna eta ingeles-maila jasota daude.
III. eranskineko gai-zerrenda duen PDF ofiziala estekatzen da, baina
Euskadi.eus-en `robots.txt` fitxategiak PDF horien deskarga automatikoa
debekatzen duenez, ez dira gaiak erauzten eta PDFak ez dira egiaztatutzat
markatzen. Hautagaien emaitzak eta zerrendak ez dira inportatzen; urte
berrietako prozesuak hurrengo integrazioetan berrikusi behar dira.

## Lan Harremanen Kontseilua · Consejo de Relaciones Laborales

[EHAAko 2023ko urtarrilaren 9ko ebazpenak](https://www.euskadi.eus/bopv2/datos/2023/01/2300110a.shtml)
2022ko aparteko egonkortze-OPEaren oinarri orokorrak eta bi eranskin
espezifiko ditu. Negoziazio kolektiboko teknikari plaza bat Bilbon eta
lan-harremanen arloko bi administrari plaza Bilbon eta Donostian jasota
daude. Titulazioak eta nahitaezko euskarako 3. eta 2. hizkuntza-eskakizunak
bereizita gordetzen dira. Merezimendu-lehiaketak dira, azterketako
gai-zerrendarik gabe. Izen-emateko epea argitalpenaren ondoko hogei egun
baliodunekoa da; ez da data absoluturik kalkulatzen. Ez dira hautagaien
emaitzak edo beste urteetako deialdiak inportatzen.

## Bilbao Orkestra Sinfonikoa

[BOSen musikariak hautatzeko atariko](https://www.bilbaorkestra.eus/la-orquesta/audiciones/)
2026ko ENT202602, ENT202603 eta ENT202604 audizioen deialdi PDF ofizialak
egiaztatu dira. Biolontxelo tuttiko bi plaza, kontrabaxuko bakarlari
plaza bat eta bakarlariaren laguntzaile plaza bat daude. Musikako
erdi-mailako titulua eskatzen da; izena emateko azken egunak 2026-09-30
eta 2026-10-07 dira. Epeak amaituta daude, baina atariak prozesuak
«en curso» atalean mantentzen ditu. II. eranskineko errepertorioa
PDF berera estekatzen da; ez da musika-obra zerrenda okerrik erauzten.
Hautagaien izenak, emaitzak eta beste audizio historikoak ez dira
integrazio honetan inportatzen.

## eLankidetza

[eLankidetzaren egonkortze-prozesuko artxiboan](https://www.elankidetza.euskadi.eus/proceso-especial-de-consolidacion-de-empleo/webela01-edukiconsolidacion/es/)
2022ko hiru fitxa eta lau plaza daude: bi administrari, lankidetza-teknikari
bat eta informatika-teknikari bat. Fitxa bakoitzetik lotutako EHAAko 2022/5691
ebazpena eta eranskinak egiaztatu dira. Izen-ematea 2023-01-26an itxi zen.
Administrarien 2. hizkuntza-eskakizuna eta lankidetza-teknikariaren 4.a
derrigorrezkoak dira; informatika-plazaren 3. profilak ez du derrigortasun
datarik, eta ez da nahitaezko eskakizun gisa ezartzen. Merezimendu-lehiaketak
dira, azterketako gai-zerrendarik gabe. Hautagaien agiriak eta urte berrietako
deialdiak hurrengo berrikuspenetarako geratzen dira.

## Finantzen Euskal Institutua

[Erakundearen gardentasun-atariak](https://www.ivf-fei.euskadi.eus/informacion/ivf/transparencia/webivf00-cnt/es/)
ez du gaur egun hautaketa-prozesu aktiborik iragartzen. Euskadi.eus-eko
erakundearen 2025eko bi eta 2026ko lan-eskaintza historiko egiaztatu dira:
Bilboko lau plaza guztira, horietatik bi 2025eko lehen deialdian.
Fitxek izen-emateko epe absolutuak, titulazioak eta gutxieneko bi urteko
esperientzia jasotzen dituzte. Ingelesa PL2 nahitaezkoa da; euskara PL3ra
arte meritua da. 2025eko funts eta partaidetzen analista-plazaren oinarri
PDFa ere egiaztatu da. Ez da azterketako gai-zerrendarik argitaratzen
fitxa hauetan. Beste prozesu historikoak eta deialdi berriak berrikusteko
daude.

## Euskal Trenbide Sarea

[ETSren 2022ko kanpoko deialdiaren albiste ofizialean](https://www.ets-rfv.euskadi.eus/noticia/2022/ets-lanza-una-convocatoria-externa-para-personal-de-circulacion-puesto-de-mando-y-gestion-de-red/webets00-general/es/)
zirkulazio, aginte-postu eta sare-kudeaketako lan-poltsa bat iragarri zen.
Gehienez 125 hautagai hartzeko aukera ez da 125 plaza gisa gordetzen.
FPII edo goi-mailako LH nahiz Batxilergoa, euskarako B2 maila
(agiriarekin edo ahozko proba gaindituta) eta 2022-12-26ko epea
egiaztatuta daude. Albisteak zirkulazio-araudiko proba aipatzen du,
baina ez du materialaren zuzeneko estekarik. 2026ko hautaketa-zerbitzuaren
lizitazioa kontratu publikoa da, ez hautagaientzako deialdia.
Beste lan-deialdiak eta ikasgai-materiala berrikusteko daude.

## Euskadiko Kirol Portuak

[Qualis Consultoresen enplegu publikoko atarian](https://www.qualisconsultores.es/oferta-publica-de-empleo-procesos-en-curso)
EKPren 2026ko bi kanpo-prozesu daude. EKPk kontratatutako enpresa
laguntzailearen oinarri PDFak egiaztatu dira: Mutrikuko administrari
laguntzaile plaza bat eta Donostia, Getaria eta Orioko portuetan
ustiapen-arduradun plaza bat. Biek B2 euskara eta B motako gidabaimena
eskatzen dituzte; titulazio-baldintzak desberdinak dira. Izen-emateak
2026-04-09an eta 2026-07-19an itxi ziren. Atari bereko hautagaien
zerrendak eta emaitzak baztertzen dira. Oinarriek hautaketa-faseak
azaltzen dituzte, baina ez dute azterketako gai-zerrendarik.
Gainerako urteak berrikusteko daude.

## Vitoria-Gasteiz Araba Mobility Lab

[Qualis Consultoresen enplegu publikoko atarian](https://www.qualisconsultores.es/oferta-publica-de-empleo-procesos-en-curso)
fundazioaren 2026ko hiru kanpo-prozesuren oinarri orokor eta
espezifikoak egiaztatu dira: bi berrikuntza-teknikari, datu-analista
bat eta Europako proiektuen teknikari bat. Lanpostuak Vitoria-Gasteizen
daude; izen-ematea 2026-04-12an edo 2026-06-18an itxi zen.
Berrikuntzako eta datuetako lanpostuek B2 eta C1 euskara eskatzen
dute hurrenez hurren; Europako proiektuetan euskara meritua da,
ingelesa C1 derrigorrezkoa. Oinarriek hautaketa-faseak eta baremoa
jasotzen dituzte, baina ez azterketako gai-zerrendarik. 202604mobilitylab
barne-sustapena eta hautagaien zerrendak baztertu dira. Beste urteak
berrikusteko daude.

## Álava Agencia de Desarrollo

[Arabako enplegu publikoaren atari ofizialean](https://enplegupublikoa.araba.eus/es/-/alava-agencia-de-desarrollo-sa-seleccion-de-personal-laboral-ingeniera)
202601aad ingeniari-plazaren fitxa eta oinarri orokor zein espezifikoen
[PDFa](https://enplegupublikoa.araba.eus/documents/d/enplegupublikoa/bases-ingeniero-202601aad)
egiaztatu dira. Gasteizko lanpostuak Ingeniaritza Zibileko edo Industrialeko
gradua, edo Obra Publikoetako edo Industria Ingeniaritza Teknikoko titulua
eskatzen du; B1 euskara, B gidabaimena eta bi urtetik gorako esperientzia ere
derrigorrezkoak dira. Izen-ematea 2026-07-05ean amaitu zen. Oinarriek ez dute
azterketako gai-zerrendarik. Arabako atariaren fitxa labur bikoiztua baztertu
da; beste prozesuak berrikusteko daude.

## Indesa 2010

[Indesaren enplegu-atarian](https://www.indesa.eus/es/empleo/)
2026ko Lan Saileko arduradun-plaza egiaztatu da. [Oinarri orokor eta
espezifikoen PDFak](https://www.indesa.eus/wp-content/uploads/2026/05/0-0-Bases-responsable-del-dpto-laboral-1.pdf)
kanpo-hautagaientzako txanda, plaza bakarra, derrigorrezko titulazioak,
hiru urteko esperientzia, B gidabaimena eta 2026-06-19ko epea jasotzen ditu.
I. eranskineko 20 gaiak katalogoan daude; euskara meritua da. Barne-txandak
lehentasuna dauka plaza esleitzeko. Foru-atariko fitxa labur bikoiztua
baztertu da. 2026ko garbiketa-lanpoltsen oinarriak PDF eskaneatuak dira,
eta haien baldintzak berrikusteko daude; barne-mugikortasuneko prozesuak eta
hautagaien emaitzak ez dira deialdi gisa inportatzen.

## Naturgolf

[Izki Golfeko Naturgolfen orri ofizialean](https://www.izkigolf.eus/naturgolf-perfil-contratante/)
2022ko zaintzaile-harreragile plaza bakarraren [oinarriak eta bost gaiko
gai-zerrenda](https://www.izkigolf.eus/wp-content/uploads/2022/02/Anuncio-Bases-CONTRATACION-VIGILANTE-RECEPCIONISTA.pdf)
egiaztatu dira. Lan-kontratua mugagabe aldizkakoa zen, eta gutxieneko
titulazioa Eskola Graduatua edo DBH zen. Euskara meritua zen. Eskabide-epea
argitalpenaren hurrengo egunetik hamar egun naturalekoa zen; argitalpenaren
egun zehatzik gabe, amaiera-data absolutua hutsik dago. Kontratazio
publikoko lizitazioak eta hautagaien emaitzak baztertu dira. 2019ko
deialdiak berrikusteko daude.

## Beaz Bizkaia

[Beazen enplegu-orri ofizialak](https://beaz.bizkaia.eus/empleo/) gaur egun
hautaketa-prozesu aktiborik ez dagoela berariaz adierazten du. Konektoreak
mezu hori egiaztatzen du eta zero fitxa itzultzen du; mezua aldatzen bada,
berrikusteko errorea sortzen du. Orrialdeak amaitutako prozesuen atala ere
badu, baina oraingoz ez dago bertan egiaztatutako deialdi-fitxarik. Inbentarioko
auditorian zero erregistro izateak ez du enplegu-deialdirik inoiz egon ez dela
adierazten.

## INTIA

[CPENen enplegu-atari ofizialeko INTIAren fitxa](https://empleo.sociedadespublicasdenavarra.es/jobs/personal-tecnico-gestion-de-personas)
katalogoan sartu da: pertsonen kudeaketako teknikari-lanpostua da, Atarrabian,
eta atariak itxita dagoela dio. Fitxak Lan Harremanetako, Zuzenbideko edo
giza baliabideekin lotutako antzeko unibertsitate-gradua, laneko arriskuen
prebentzioko masterra, bi urteko esperientzia eta B gidabaimena eskatzen ditu.
Euskara, frantsesa eta ingelesa merezimenduak dira. Argitalpen-egunak ez du
urterik adierazten; beraz, amaiera-data hutsik dago. Fitxak ez du azterketako
gai-zerrendarik. CPENen zerrenda arruntean ez dagoenez, berrikusitako URL
historikoa ere kontsultatzen da; horrek ez du INTIAren deialdi guztien
estaldura frogatzen.

## Nafarbide

[CPENen Nafarbideren fitxa ofizialak](https://empleo.sociedadespublicasdenavarra.es/jobs/personal-tecnico-sistemas-de-gestion-procesos-e-inteligencia-de-negocio)
kudeaketa-sistemen, prozesuen eta negozio-adimenaren teknikari-lanpostua
jasotzen du. Atariak itxita dagoela dio. Erakundeak industria-antolakuntzako
edo prozesuetako ingeniaritza, ingurumen-zientziak, industria-segurtasuna,
datuen zientzia, kudeaketa-sistema integratuetako goi-mailako teknikariaren
titulua edo antzeko prestakuntza teknikoa eskatzen du, eta gutxienez hiru
urteko esperientzia. Argitalpen-datak urterik ez duenez, amaiera-data
ezezaguna da. Fitxan ez dago azterketako gai-zerrendarik. Berrikusitako
URL historikoa CPENen zerrenda arruntaz gain kontsultatzen da; horrek ez du
Nafarbideren deialdi guztien estaldura frogatzen.

## Instituto Navarro de Inversiones

[CPENen INIren analista-fitxa ofiziala](https://empleo.sociedadespublicasdenavarra.es/jobs/analista-b59fc039-fe62-4ee5-8abe-99958bfd05e6)
itxita dago. Nafarroako Inbertsioen Institutuaren lanpostuak Enpresen
Administrazio eta Zuzendaritzako, Ekonomiako edo antzeko gradua eta banku edo
finantzetako MBA edo graduondokoa eskatzen ditu; inbertsio-analisian sei urte
baino gehiagoko esperientzia eta ingeleseko C1 maila ere derrigorrezkoak dira.
Frantsesa merezimendu gisa ageri da. Fitxak ez du azterketako gai-zerrendarik.
Argitalpen-egunak urterik ez duenez, amaiera-data ezezaguna da. URL historiko
berrikusia CPENen zerrenda arruntaz gain kontsultatzen da; horrek ez du INIren
deialdi guztien estaldura frogatzen.

## NASERTIC

[CPENen NASERTICen arreta herritarrerako teknikariaren fitxa](https://empleo.sociedadespublicasdenavarra.es/jobs/personal-tecnico-atencion-ciudadana)
itxita dago. Gutxieneko titulazioa Batxilergoa, administrazioko erdi-mailako
LH edo enpresak parekatutako ezagutzak dira; sei hilabeteko esperientzia,
euskarako B2 maila eta gidabaimena ere eskatzen dira. Atariak argitalpen-eguna
urterik gabe erakusten du; amaiera-data ezezaguna da. Ez dago azterketako
gai-zerrendarik. CPENen zerrenda arruntaz gain berrikusitako fitxa historikoa
kontsultatzen da; horrek ez du NASERTICen deialdi guztien estaldura frogatzen.

## OREKAN

[CPENen OREKANen biodibertsitateko teknikariaren fitxa](https://empleo.sociedadespublicasdenavarra.es/jobs/tecnico-a-superior-para-el-area-de-biodiversidad)
itxita dago. Biologiako, Ingurumen Zientzietako edo justifikatutako antzeko
unibertsitate-titulua eta fauna monitorizatzeko esperientzia eskatzen ditu;
euskara eta ingelesa merezimendu gisa aipatzen dira. Fitxan ez dago
azterketako gai-zerrendarik. Argitalpen-datak urterik ez duenez, amaiera-data
ezezaguna da. CPENen zerrenda arruntaz gain berrikusitako URL historikoa
kontsultatzen da; horrek ez du OREKANen deialdi guztien estaldura frogatzen.

## SODENA

[CPENen SODENAren Invest in Navarra teknikariaren fitxa](https://empleo.sociedadespublicasdenavarra.es/jobs/tecnico-a-invest-in-navarra)
itxita dago. Goi-mailako unibertsitate-titulua eskatzen du, batez ere
Ekonomiako, Komunikazio eta Marketineko, Ekintzailetzako edo Informatikako
ikasketak; ingeles arina ere aipatzen du. Fitxak ez du azterketako gai-zerrendarik.
Argitalpen-datak urterik ez duenez, amaiera-data ezezaguna da. CPENen
zerrenda arruntaz gain berrikusitako URL historikoa kontsultatzen da;
horrek ez du SODENAren deialdi guztien estaldura frogatzen.

## Ciudad Agroalimentaria de Tudela

[CPENen CATen operazio-arduradunaren fitxa ofiziala](https://empleo.sociedadespublicasdenavarra.es/jobs/responsable-de-operaciones-cat)
itxita dago. Tuterako kogenerazio-instalazioaren lanpostuak industria-
ingeniaritzako gradua, lizentzia, diplomatura edo antzeko titulua eta laneko
arriskuen prebentzioko 60 orduko ikastaroa eskatzen ditu; esperientzia
industrialari buruzko baldintzak ere jasotzen ditu. Ez dago azterketako
gai-zerrendarik. Argitalpen-egunak urterik ez duenez, amaiera-data ezezaguna
da. CPENen zerrenda arruntaz gain URL historiko berrikusia kontsultatzen da;
horrek ez du CATen deialdi guztien estaldura frogatzen.

## FUNDAPA

[FUNDAPAren iragarki-taulan](https://www.fundapa.org/inicio/tablon-de-anuncios/)
2026-03-26ko teknikari ekonomikoaren aldi baterako ordezkapen-zerrendaren
[oinarri ofizialak](https://www.fundapa.org/site/wp-content/uploads/CONVOCATORIA-DE-FUNDAPA-SUSTITUCION-TECNICO-A-ECONOMICO-A-26-03-2026.pdf)
egiaztatu dira. Enpresen Administrazio eta Zuzendaritzako edo Ekonomiako
gradua edo lizentzia, Enpresa Zientzietako diplomatura edo titulu baliokidea
onartzen dira. Eskabide-epea 2026-04-06an 14:00etan amaitu zen. Probak 50
galderako testa dauka, eta PDFko zortzi gaiak katalogoan daude. Ordezkapen-
zerrenda ez da plaza finko gisa aurkezten. Onartuen zerrendak eta probaren
emaitzak kanpoan geratzen dira; beste deialdiak berrikusteko daude.

FUNDAPAren [Gizarte Laneko/Gizarte Hezkuntzako plaza bakarraren
oinarriak](https://www.fundapa.org/site/wp-content/uploads/Bases-TS-ES-Concurso-Oposicion.pdf)
ere egiaztatu dira. Diplomatura edo gradua bi arlo horietako batean, edo
titulu baliokidea, eskatzen dute. I. eranskineko 23 epigrafeak katalogoan
daude; jatorrizko PDFak 5. zenbakia birritan erabiltzen du eta horrela
gorde da. Iragarki-taulak 2023-06-06ko amaierako iragarkia erakusten du;
eskabide-epea BONeko argitalpenaren ondoko hamar egun naturalekoa zen,
baina amaiera-data absolutua ez da egiaztatu. Hautagaien emaitzen PDFak
ez dira deialdi gisa inportatzen.

## Moncayoko Uren Mankomunitatea

[2020ko otsailaren 7ko BONeko oinarri zuzenduetan](https://bon.navarra.es/es/anuncio/-/texto/2020/26/23)
bi arduradun-plaza ageri dira: bat txanda librekoa eta bestea barne-
sustapenekoa. Katalogoan kanpoko txandako plaza bakarra sartu da. Gutxieneko
titulazioa Batxilergoa edo FPII da; C gidabaimena behar da, eta CAP txartela
izendapenaren aurretik. II. eranskineko 15 epigrafeak jaso dira. BONek 11.
zenbakia bi aldiz erabiltzen du, eta jatorrizko ordena mantendu da.
Eskabide-epea argitalpenaren biharamunetik 30 egun naturalekoa zen; ez da
amaiera-data absoluturik kalkulatu. Beste deialdi historikoak berrikusteko daude.

## Euskarabidea

[BON 2026/197/7ko oinarriek](https://bon.navarra.es/es/anuncio/-/texto/2026/197/7)
euskara itzultzaile-interpretearen 36009 plaza Euskarabidea-Instituto Navarro
del Euskera erakundeari atxikita dagoela diote. Nafarroako katalogoan lehendik
zegoen deialdiak 93 gai ditu. Funtzio Publikoa da organo deitzailea; datu hori
bere horretan gorde da, eta inbentarioko auditorian atxikipen egiaztatua
gehitu da. Plaza bakarraren presentziak ez du erakundearen deialdi guztien
estaldura frogatzen.

## Nafarroako Kirolaren Institutua

[3773/2025 Ebazpenaren I. eranskinak](https://www.navarra.es/documents/48192/48964728/R202503773+determinar+plazas+TCO+SUP+DEPORTE+2025.doc.pdf/43636484-000b-cdcf-a596-1ff02c58cf42?t=1766487900240)
Kirolaren Goi Mailako Teknikariaren 5071, 10357 eta 11763 plazak Nafarroako
Kirolaren eta Jarduera Fisikoaren Institutuari atxikitzen dizkio. Lehen biek
C1 euskara eskatzen dute; hirugarrenak ez du hizkuntza-eskakizunik adierazten
eranskin horretan. Katalogoan lehendik zegoen deialdiak hiru plaza eta 95 gai
ditu. Funtzio Publikoa da organo deitzailea; inbentarioko auditorian soilik
gehitu da egiaztatutako atxikipena. Deialdi baten presentziak ez du erakundearen
eskaintza guztien estaldura frogatzen.

## Nafarroako Gazteriaren Institutua

[BON 2026/7/3ko II. eranskinak](https://bon.navarra.es/es/anuncio/-/texto/2026/7/3)
Gazteriaren Goi Mailako Teknikariaren 10384 eta 11441 plazak Nafarroako
Gazteriaren Institutuari atxikitzen dizkio. Lehenak C1 euskara eskatzen du;
bigarrenak B gidabaimena. Katalogoan lehendik zegoen deialdiak bi plaza eta 99
gai ditu. Funtzio Publikoa da organo deitzailea; inbentarioko auditorian soilik
gehitu da egiaztatutako atxikipena. Deialdi baten presentziak ez du erakundearen
eskaintza guztien estaldura frogatzen.

## Nafarroako Foru Ogasuna

[BON 2026/82/1eko II. eranskinak](https://bon.navarra.es/es/anuncio/-/texto/2026/82/1)
Ogasuneko Teknikariaren bederatzi plazak Nafarroako Foru Ogasunari atxikitzen
dizkio. Katalogoan lehendik zegoen deialdiak bederatzi plaza eta 150 gai ditu.
Funtzio Publikoa da organo deitzailea; inbentarioko auditorian soilik gehitu da
egiaztatutako atxikipena. Deialdi baten presentziak ez du erakundearen
eskaintza guztien estaldura frogatzen.

## Nafarroako Berdintasunerako Institutua

[BON 2024/153/2ko II. eranskinak](https://bon.navarra.es/es/anuncio/-/texto/2024/153/2)
Berdintasuneko Erdi Mailako Teknikariaren hamar plazak Nafarroako
Berdintasunerako Institutuari atxikitzen dizkio. 10581 plazak C1 euskara
eskatzen du; gainerakoek ez dute hizkuntza-eskakizunik adierazten eranskin
horretan. Katalogoan lehendik zegoen deialdiak hamar plaza eta 78 gai ditu.
Funtzio Publikoa da organo deitzailea; inbentarioko auditorian soilik gehitu da
egiaztatutako atxikipena. Deialdi baten presentziak ez du erakundearen
eskaintza guztien estaldura frogatzen.

## Nafarroako Enplegu Zerbitzua

[BON 2026/44/7ko II. eranskinak](https://bon.navarra.es/es/anuncio/-/texto/2026/44/7)
Enpleguko Goi Mailako Tituludunaren zortzi plazetatik zazpi Nafarroako Enplegu
Zerbitzuari atxikitzen dizkio: 9456, 10534, 10535, 10536, 11746, 11748 eta
11778. 39466 plaza Hezkuntza Sailari dagokio. Katalogoan lehendik zegoen
deialdiak zortzi plaza eta 100 gai ditu. Funtzio Publikoa da organo deitzailea;
inbentarioko auditorian soilik gehitu da egiaztatutako atxikipena. Deialdi
baten presentziak ez du erakundearen eskaintza guztien estaldura frogatzen.

## Nafarroako Autonomiarako eta Pertsonen Garapenerako Agentzia

[1512/2026 Ebazpenaren eranskinak](https://www.navarra.es/documents/48192/43565909/R202601512+Res+determinar+plazas+TRABAJADOR+SOCIAL+2024.pdf/fc9bf905-78d4-8e70-c9f1-99dedc0e45d7?t=1778069983389)
Gizarte Langilearen 58 plazetatik zortzi agentziari atxikitzen dizkio: 2870,
6568, 8186, 11514, 11515, 11516, 11517 eta 11691. Katalogoan lehendik
zegoen deialdiak 75 gai ditu. Funtzio Publikoa da organo deitzailea;
inbentarioko auditorian soilik gehitu da egiaztatutako atxikipena. Deialdi
baten presentziak ez du erakundearen eskaintza guztien estaldura frogatzen.

## Nafarroako Analisi eta Prospekzio Bulegoa

[3775/2025 Ebazpenaren I. eranskinak](https://www.navarra.es/documents/48192/52151355/R202503775+determinar+plazas+TGM+ESTADISTICO+2025.doc.pdf/9d3943df-91c0-9c80-97dc-3b3a7c571026?t=1766489014077)
Estatistikako Erdi Mailako Tituludunaren sei plazetatik 8737 plaza bulegoari
atxikitzen dio. Beste bost plazak Plangintza, Koordinazio, Berrikuntza eta
Politika Publikoen Ebaluazioko Zuzendaritza Nagusiari dagozkio. Katalogoan
lehendik zegoen deialdiak 81 gai ditu. Funtzio Publikoa da organo deitzailea;
inbentarioko auditorian soilik gehitu da egiaztatutako atxikipena. Deialdi
baten presentziak ez du erakundearen eskaintza guztien estaldura frogatzen.

## Alloko Udala

[2026ko martxoaren 12ko udal-iragarkiak](https://www.villadeallo.org/es/actualidad/noticias/980-oferta-de-empleo-ayuntamiento-de-allo.html)
eta bertan estekatutako bost orrialdeko oinarriek instalazioen erabilera
hobetzeko peoi-plaza bat iragartzen dute. Aldi baterako kontratua urtebetekoa
da gehienez, gutxieneko ikasketak DBH dira, SNE-Nafar Lansaren peoi gisa
inskribatuta egon behar da eta eskabideen epea 2026-03-17an amaitu zen.
Idatzizko probak laneko ohiko zereginak eta udal-araudia hartzen ditu;
ez dago gai-zerrenda zenbakiturik. LASEMEren eskaintza bereizia ez da
udal-lanpostutzat hartu. Gainerako udal-artxiboa berrikusteko dago.

## HABE: enplegu-iturrien berrikuspena

2026-11-26an [HABEren hasierako orria](https://www.habe.euskadi.eus/hasiera/)
HTTP 200 bidez kontsultatu da. Bertan nabarmendutako
[2026ko azterketa-deialdiak](https://www.habe.euskadi.eus/azterketa-deialdiak/webhabe00-edukiak/eu/)
ikasleen euskara-mailak egiaztatzeko dira; matrikulazio-epeak ezin dira
lanpostuetarako eskabide-epe gisa hartu.

[IVAPen enplegu publikoaren atari ofizialak](https://www.ivap.euskadi.eus/empleo-ivap/)
2026ko OPEa EAEko Administrazio Orokorraren eta haren erakunde autonomoen
esparruan aurkezten du. Berrikusitako orriek ez dute HABEri berariaz
atxikitako lanpostu bat bere oinarri ofizialekin batera egiaztatzen.
Horregatik, HABE `pending` dago oraindik: ez da deialdirik asmatu edo
konektorerik gehitu. Atari orokorra ez da erakunde honen estaldura osoaren
froga; HABEren lanpostu zehatz baten atxikipena eta oinarriak egiaztatu
beharko dira inportatu aurretik.

## Eustat: enplegu-iturrien berrikuspena

2026-11-26an [Eustaten robots.txt fitxategiak](https://www.eustat.eus/robots.txt)
HTTP 200 itzuli du, baina `User-agent: *` arauaren `Disallow: /` lerroak
webgunearen bilketa automatikoa baztertzen du. Hasierako orriaren HTTP 200
erantzunak ez du muga hori kentzen.

[BOPV 235/2025eko 5185 ebazpen ofizialak](https://www.euskadi.eus/bopv2/datos/2025/12/2505185a.shtml)
Eustaten Estatistika Ekoizpen eta Azterketako zuzendariordearen 512036-2
lanposturako izendapen askeko prozesua argitaratu zuen. Karrerako
funtzionarioek parte har zezaketen, ebazpeneko baldintzen arabera;
eskabide-epea argitalpenaren biharamunetik 15 egun baliodunekoa zen. 2025eko
prozesu historiko hori ez da sarbide irekiko hautaketa-deialdi gisa sartu.
BOPVko agiri bakarrak ez du Eustaten enplegu-deialdi guztien estaldura
egiaztatzen. Horregatik, erakundea `pending` dago oraindik eta ez da
konektorerik edo fitxarik gehitu.

## Emakunde: enplegu-iturrien berrikuspena

2026-11-26an [IVAPen enplegu-atari ofiziala](https://www.ivap.euskadi.eus/empleo-ivap/)
berrikusi da. 2026ko OPEa EAEko Administrazio Orokorraren eta haren erakunde
autonomoen esparruan aurkezten du, baina orri orokorrak ez du Emakunderi
berariaz atxikitako sarbide irekiko plaza eta haren oinarrien pare egiaztaturik
ematen. [Emakunderen «Subvenciones y convocatorias» orriak](https://www.emakunde.euskadi.eus/informacion/relacion-de-subvenciones-de-emakunde/webema01-contentservi/es/)
laguntzak, bekak eta sariak zerrendatzen ditu; ez dira langileen hautaketa-
deialdiak.

[BOPV 216/2025eko 4758 ebazpenak](https://www.euskadi.eus/bopv2/datos/2025/11/2504758a.pdf)
520010 kodeko eta 114 dotazioko goi-kargudunaren idazkari lanposturako
izendapen askeko prozesua argitaratu zuen. Parte-hartzaileak baldintzak
betetzen zituzten karrerako funtzionarioak ziren; eskabideak argitalpenaren
biharamunetik 15 egun baliodunetan aurkeztu behar ziren. Prozesu historiko
hori ez da sarbide irekiko hautaketa-deialdi gisa inportatu. Emakunde
`pending` dago oraindik: berrikusitako iturriek ez dute erakundearen deialdi
guztien estaldura edo eskaintzarik eza frogatzen, eta ez da scraper-rik gehitu.

## Osalan: enplegu-iturrien berrikuspena

2026-11-26an [Osalanen webgune ofiziala](https://www.osalan.euskadi.eus/osalan/)
eta [IVAPen enplegu-ataria](https://www.ivap.euskadi.eus/empleo-ivap/) kontsultatu
dira. IVAPek 2026ko OPEa EAEko Administrazio Orokorraren eta haren erakunde
autonomoen esparruan aurkezten du, baina orri orokorrak ez du Osalani
berariaz atxikitako plaza eta haren oinarrien pare egiaztaturik ematen.

[BOPV 209/2025eko 4622 ebazpenaren PDF ofizialak](https://www.euskadi.eus/bopv2/datos/2025/10/2504622a.pdf)
Osalanen Plangintzako zuzendariordearen 512066 kodeko, 1 dotazioko lanpostua
izendapen askearen bidez hornitzeko deialdia jasotzen du. Baldintzak betetzen
zituzten karrerako langile publikoek har zezaketen parte; eskabide-epea
argitalpenaren biharamunetik 15 egun baliodunekoa zen. [BOPV 251/2025eko
5539 ebazpenak](https://www.euskadi.eus/bopv2/datos/2025/12/2505539a.shtml)
prozesua ebatzi zuen. Prozesu historiko hori ez da sarbide irekiko hautaketa-
deialdi gisa inportatu. Osalan `pending` dago oraindik: berrikuspenak ez du
erakundearen deialdi guztien estaldura edo eskaintzarik eza frogatzen, eta ez da
scraper-rik gehitu.

## Kontsumobide: enplegu-iturrien berrikuspena

2026-11-26an [Kontsumobideren webgune ofiziala](https://www.kontsumobide.euskadi.eus/inicio/)
eta [IVAPen enplegu-ataria](https://www.ivap.euskadi.eus/empleo-ivap/) berrikusi
dira. IVAPek 2026ko OPEa EAEko Administrazio Orokorraren eta haren erakunde
autonomoen esparruan aurkezten du; orri orokorrak ez du Kontsumobideri
berariaz atxikitako sarbide irekiko plaza eta haren oinarrien pare egiaztaturik
ematen.

[BOPV 28/2026ko 622 ebazpenaren PDF ofizialak](https://www.euskadi.eus/bopv2/datos/2026/02/2600622a.pdf)
Kontsumobideren 520010 kodeko, 107 dotazioko goi-kargudunaren idazkari
lanpostua izendapen askearen bidez hornitzeko deialdia jasotzen du. Baldintzak
betetzen zituzten karrerako funtzionarioentzat zen; eskaerak argitalpenaren
biharamunetik 15 egun baliodunetan aurkeztekoak ziren.
[BOPV 60/2026ko 1369 ebazpenak](https://www.euskadi.eus/bopv2/datos/2026/03/2601369a.shtml)
lanpostua esleitu zuen, 2026-03-25etik aurrerako ondorioekin. Prozesu historiko
itxi hori ez da sarbide irekiko hautaketa-deialdi gisa inportatu. Kontsumobide
`pending` dago oraindik: berrikuspenak ez du erakundearen deialdi guztien
estaldura edo eskaintzarik eza frogatzen, eta ez da scraper-rik gehitu.

## Lehiaren Euskal Agintaritza: enplegu-iturrien berrikuspena

2026-11-26an [erakundearen egitura-orri ofiziala](https://www.competencia.euskadi.eus/avc/estructura/webavc00-container/es/)
kontsultatu da. Bertan 17 lanpostuko plantilla ageri da, baina ez da lanpostu
hutsen zerrenda edo hautaketa-deialdia. Webguneko berrikusitako nabigazioak ez
du langileak hautatzeko atari bereizia erakutsi.

[BOPV 196/2025eko 4342 ebazpenaren PDF ofizialak](https://www.euskadi.eus/bopv2/datos/2025/10/2504342a.pdf)
idazkari nagusiaren 511946 kodeko lanpostua (2 dotazioa) izendapen askearen
bidez hornitzeko deialdia jasotzen du. Karrerako funtzionarioei mugatua zen;
eskaerak argitalpenaren biharamunetik 15 egun baliodunetan aurkeztekoak ziren.
PDFaren SHA-256 balioa `b9f8f30c9e2dd55ce9cd7486e81e8dd0993127fc036b22950caee22e3f3506bc`
da. [BOPV 247/2025eko 5480 ebazpenak](https://www.euskadi.eus/bopv2/datos/2025/12/2505480a.shtml)
lanpostua esleitu zuen, 2025-12-11tik aurrerako ondorioekin. Prozesua itxita
dago eta ez da sarbide irekiko hautaketa; ez da fitxarik edo scraper-rik gehitu.
Erakundea `pending` dago oraindik, berrikuspen honek ez baitu deialdi guztien
estaldura edo eskaintzarik eza frogatzen.

## Gogora: enplegu-iturrien berrikuspena

2026-11-26an [Gogoraren gardentasun-orria](https://www.gogora.euskadi.eus/transparencia-gogora/webgog00-transgog/es/)
berrikusi da. Bertako «Subvenciones y convocatorias de Gogora» esteka
dirulaguntzei dagokie; berrikusitako nabigazioak ez du langileen hautaketarako
atari bereizirik erakutsi. Horrek ez du enplegu-deialdirik ez dagoela frogatzen.

[IVAPen 2025-04-04ko lanpostu-zerrenda ofizialak](https://www.ivap.euskadi.eus/contenidos/noticia/2022_ope_20250408_i/es_def/adjuntos/3_ES_2025-04-04.pdf)
Gogoraren 520020 kodeko, 1029 dotazioko «Auxiliar General» lanpostua jasotzen
du, 2022ko OPEren finkatze-prozesu bereziaren testuinguruan. Zerrenda hori ez
da egungo izen-emate deialdia. [BOPV 42/2025eko 981 agiriak](https://www.euskadi.eus/bopv2/datos/2025/03/2500981a.pdf)
2022ko finkatze-prozesuen ondorengo karrerako funtzionarioen izendapenak
argitaratzen ditu, Gogorari atxikitako lanpostuak barne. Izendapenak ez dira
lanpostu hutsen deialdiak.

Berrikusitako agiriek ez dute Gogoraren egungo sarbide irekiko deialdi baten
eta haren oinarri ofizialen pare egiaztaturik eman. Ez da fitxarik edo
scraper-rik gehitu. Gogora `pending` dago oraindik; berrikuspenak ez du
deialdi guztien estaldura edo eskaintzarik eza frogatzen.

## Cyberzaintza: enplegu-iturrien berrikuspena

2026-11-26an [Cyberzaintzaren atari ofizialaren hasiera](https://zibersegurtasun.euskadi.eus/hasiera/)
HTTP 200 bidez kontsultatu da. [Pribatutasun-politika ofizialak](https://ciberseguridad.euskadi.eus/webcyb00-content/es/contenidos/informacion/cyb_politica_de_privacidad/es_def/index.shtml)
lan-eskaintzen edo hautaketa-prozesuen formularioak aipatzen ditu, baina aipamen
orokorrak ez du deialdi zehatz bat edo izena emateko epea egiaztatzen.
[BOPV 155/2026ko 3627 ebazpenak](https://www.euskadi.eus/bopv2/datos/2026/08/2603627a.shtml)
agentziaren lanpostu-zerrendaren aldaketa argitaratzen du. Lanpostu-zerrenda
ez da hautaketa-deialdia, eta ez du lanpostu huts bat irekita dagoela frogatzen.

`cyberzaintza.eus` domeinuko hasierako orriak eta `robots.txt` fitxategiak
HTTP 502 eman dute kontsulta-inguruneko atebidean; ezin izan da domeinu
horretako enplegu-ataria zuzenean berrikusi. Beste domeinuetan aurkitutako
hautaketa-enpresen iragarkiak ez dira agentziaren atari ofizialaren estaldura
osoaren froga. Deialdi zehatzik bere oinarri ofizialekin batera egiaztatu ez
denez, ez da fitxarik edo scraper-rik gehitu. Cyberzaintza `pending` dago:
berrikuspenak ez du deialdirik ez dagoela frogatzen.

## Ahetze: udal-enplegu orriaren sarbidearen berrikuspena

2026-11-27an [CAPBren Ahetzeko udal-fitxak](https://www.communaute-paysbasque.fr/linstitution/les-infos-sur-ma-commune/ma-commune/ahetze)
`ahetze.fr` udal-webgune gisa identifikatzen zuela egiaztatu da.
[Udalaren «Offres d’emploi» orriaren](https://www.ahetze.fr/vie-municipale/offres-demploi/)
aurrez indexatutako kopiak 2026ko ekainetik abuztura bitarteko zerbitzu
teknikoko sasoiko kontratuen iragarkia erakusten du, maiatzaren 26ko
hautagaitza-epearekin. Kopia horrek ez du deialdiaren oinarri edo bestelako
agiri ofizialetarako estekarik erakusten; epea igarota dago.

Zuzeneko HTTPS kontsultan enplegu-orriak, hasierako orriak eta `robots.txt`
fitxategiak HTTP 403 itzuli dute. Ezin izan dira egungo deialdiak eta haien
agiri ofizialak egiaztatu. Ahetze `pending` mantendu da, eta ez da scraper-rik
gehitu. Sarbide-muga honek ez du esan nahi lanpostu hutsik ez dagoenik, eta
aurreko iragarkiak ez du atariaren estaldura osoa frogatzen.

## Aïcirits-Camou-Suhast: udal-webgunearen sarbidearen berrikuspena

2026-11-27an [CAPBren udal-fitxa ofizialak](https://www.communaute-paysbasque.fr/linstitution/les-infos-sur-ma-commune/ma-commune/aicirits-camou-suhast)
`aiciritscamousuhast.fr` udal-webgune gisa identifikatzen zuela egiaztatu da.
Webgunearen HTTPS hasierako orria eta `robots.txt` ezin izan dira TLS
egiaztapen arruntarekin irakurri: ziurtagiriaren jaulkitzailea ezin izan da
egiaztatu. Diagnostiko hutseko kontsultan, ziurtagiriaren egiaztapena kenduta,
`www` eta erro-domeinuko hasierako orriek eta `www` domeinuko `robots.txt`
fitxategiak HTTP 404 itzuli dute. Ez da gune horretako enplegu-atalik
egiaztatu.

[Udalaren 2026ko otsaileko 83. buletinaren kopiak](https://static.reseaudespetitescommunes.fr/cities/630/documents/klcz82w5qtb7r05.pdf)
gazteentzako udako lanak aipatzen ditu; iragarkiaren izenburua, ordea,
«Emplois d’été 2025» da. Testuak maiatzaren amaierako hautagaitza-epea
aipatzen du, baina urte-gatazka horrek ez du 2026ko deialdi bat zehaztasunez
egiaztatzeko aukerarik ematen. Epea, baldintzak eta agiriak ez dira katalogora
inportatu. Zuzeneko webgunea erabilgarri ez dagoenez, egungo deialdirik eta
haien agiri ofizialik ezin izan da egiaztatu. Udalerria `pending` mantendu da,
scraper-rik gehitu gabe; berrikuspenak ez du lanpostu hutsik eza edo estaldura
osoa frogatzen.

## Ainhoa: udal-enplegu orriaren berrikuspena

2026-11-27an [CAPBren Ainhoako udal-fitxa ofizialak](https://www.communaute-paysbasque.fr/linstitution/les-infos-sur-ma-commune/ma-commune/ainhoa)
`ainhoa.fr` udal-webgune gisa identifikatzen zuela egiaztatu da. Udalaren
[«Offres d'emploi» orriak](https://www.ainhoa.fr/offres-d-emploi) eta
[robots.txt fitxategiak](https://www.ainhoa.fr/robots.txt) HTTP 200 itzuli dute;
azken horrek bilketa baimentzen du. Aurreko hasierako orriaren prospekzioak
ez zuen barneko enplegu-orri hori aurkitu.

Enplegu-orriak udaleko zerbitzu teknikoak uztailean eta abuztuan indartzeko
sasoiko langileak bilatzen direla dio, baina ez du urterik, eskabide-eperik,
baldintzarik edo hautaketaren agiri ofizialik ematen. Informazio gehiago
udaletxean eskatzeko dio. Bertako CAPBren eskaintzetarako esteka elkargoaren
lanpostuei dagokie; ezin dira Ainhoako udal-deialditzat hartu. Deialdi zehatz
bat eta haren agiri ofizialak ezin izan direnez egiaztatu, Ainhoa `pending`
mantendu da eta ez da scraper-rik gehitu. Berrikuspenak ez du lanpostu hutsik
ez dagoela edo estaldura osoa frogatzen.

## Alçay-Alçabéhéty-Sunharette: udal-enplegu iturriaren berrikuspena

2026-11-27an [CAPBren udal-fitxa ofiziala](https://www.communaute-paysbasque.fr/linstitution/les-infos-sur-ma-commune/ma-commune/alcay-alcabehety-sunharette)
berrikusi da. Udalaren harremanetarako datuak ematen ditu, baina ez du
udal-webgunerik edo enplegu-orririk identifikatzen. [Estatuko zerbitzu
publikoaren direktorioak](https://lannuaire.service-public.gouv.fr/nouvelle-aquitaine/pyrenees-atlantiques/d4a2e2fc-3d70-46be-bd4a-38fac0c1bee8)
ere harremanetarako datuak ematen ditu, webgunerako estekarik gabe.

Udal-fitxan agertzen den [«Nos offres d'emploi» esteka](https://www.communaute-paysbasque.fr/linstitution/nos-offres-demploi)
CAPB elkargoaren kontratazio-atariari dagokio; bertako eskaintzak ezin dira
udalaren deialditzat hartu. Ez da udalaren deialdi zehatzik bere agiri
ofizialekin batera egiaztatu. Horregatik, udalerria `pending` mantendu da eta
ez da scraper-rik gehitu. Berrikuspenak ez du lanpostu hutsik ez dagoela edo
udal-enpleguaren estaldura osoa frogatzen.

## Aldudes: udal-enplegu iturriaren berrikuspena

2026-11-27an [CAPBren Aldudeseko udal-fitxa](https://www.communaute-paysbasque.fr/linstitution/les-infos-sur-ma-commune/ma-commune/aldudes)
eta [Estatuko udal-direktorioa](https://lannuaire.service-public.gouv.fr/nouvelle-aquitaine/pyrenees-atlantiques/46200b6c-1901-4ebf-8064-ddf1fb2d2430)
kontsultatu dira. Biek harremanetarako datuak ematen dituzte, baina ez dute
udal-webgunerik edo udalaren enplegu-orririk adierazten. CAPBko «Nos offres
d'emploi» esteka elkargoaren eskaintzetarako da, ez Aldudeseko udalerako.

[Emploi Territorialeko ATSEM iragarki ofiziala](https://www.emploi-territorial.fr/offre/o064260623001231-atsem)
(O064260623001231) eta haren [PDF esportazio publikoa](https://www.emploi-territorial.fr/exportoffres/pdf/o064260623001231-atsem)
zuzenean eskuratu dira. PDFaren SHA-256 balioa
`9178ca2093341a3198a37f394d2b6de01655feb9a1904ec967fb46fa5dd68692`
da. Biek Aldudeseko udala deitzaile gisa eta 2026-07-30eko hautagaitza-epea
jasotzen dituzte. Profilak haur-hezkuntzako CAPa, ATSEM lehiaketa gainditua
eta ahozko euskara aipatzen ditu; fitxa berak lehiaketarik gabeko zuzeneko
kontratazioa posible dela ere dio. Ez da kontraesan hori sarbide-baldintza
bakar eta sinple bihurtu. PDFa iragarki beraren kopia da, ez hautaketaren
oinarri bereiziak edo gai-zerrenda.

[Lan teknikoetako beste iragarki ofizialak](https://www.emploi-territorial.fr/offre/o064260528001040-agent-interventions-techniques-polyvalent-milieu-rural)
(O064260528001040) 2026-06-30eko epea erakusten du. Bi epeak igarota daude.
Bilaketa departamentalaren `emploi-territorial` konektorea dagoeneko martxan
dago, baina oraingo bilaketak ez ditu historiko horiek nahitaez erakusten eta
ez du udalaren deialdi guztien estaldura frogatzen. Ez da udal-scraper berririk
edo egungo deialdirik gehitu; Aldudes `pending` mantendu da.

## Alos-Sibas-Abense: udal-enplegu iturriaren berrikuspena

2026-11-27an [CAPBren udal-fitxa ofizialak](https://www.communaute-paysbasque.fr/linstitution/les-infos-sur-ma-commune/ma-commune/alos-sibas-abense)
`http://www.alos-sibas-abense.com/` udal-webgune gisa identifikatzen zuela
egiaztatu da. [Udalaren hasierako orria](http://www.alos-sibas-abense.com/),
[albisteen artxiboa](http://www.alos-sibas-abense.com/archives_infos.php) eta
udal-bilkuren orria HTTP bidez eskuratu dira; berrikusitako nabigazioak ez du
langileak hautatzeko orririk erakutsi. HTTPS konexioak huts egin du TLS
negoziazioan, eta HTTPko `robots.txt` fitxategiak 404 itzuli du. 2026ko
urriko albisteak dituen hasierako orria ez da enplegu-iturri oso baten froga.

[CDG 64ren 2024ko agiri ofizialak](https://www.cdg-64.fr/index.php?eID=dumpFile&f=13000&t=f&token=3b5500d94154f2d64f1043611b6084e58a69144a)
`V064241129002092001` lanpostu-adierazpena jasotzen du: udal-idazkariaren
lanpostua barne-sustapen baten bidez sortua. Adierazpenak ez du izen-emate
deialdirik, oinarririk edo gai-zerrendarik ematen. Alosen kokatutako
[2026ko CAPBren haur-animatzaile eskaintzak](https://www.communaute-paysbasque.fr/linstitution/nos-offres-demploi/offres-demploi-et-stages/animateur-enfance-jeunesse-f-h-pour-laccueil-de-loisirs-dalos-118-2026-plsp)
CAPB izendatzen du enplegatzaile, ez udala; 2026-10-07ko epea igarota dago.
Ez da udal-deialdi zehatzik haren agiri ofizialekin batera egiaztatu.
Alos-Sibas-Abense `pending` mantendu da, udal-scraper edo fitxa berririk gabe;
berrikuspen honek ez du lanpostu hutsik eza edo udalaren enpleguaren estaldura
osoa frogatzen.

## Amendeuix-Oneix: udal-enplegu iturriaren berrikuspena

2026-11-27an [Estatuko zerbitzu publikoaren direktorioak](https://lannuaire.service-public.gouv.fr/nouvelle-aquitaine/pyrenees-atlantiques/51ec7238-15b0-4995-994b-5d3f1f13f25e)
`https://amendeuix-oneix.com/` udal-webgune gisa identifikatzen zuela egiaztatu
da. [Udalaren hasierako orriaren](https://amendeuix-oneix.com/),
[udal-orriaren](https://amendeuix-oneix.com/mairie-amendeuix-oneix/) eta
[albisteen artxiboaren](https://amendeuix-oneix.com/actualites/) edukia web
bilatzailearen bidez irakurri da. Udal-orriak langileak izendatzen ditu eta
albisteen artxiboak udal-jarduerak erakusten ditu; ikusitako nabigazioak ez du
kontratazio-atalik edo udalaren hautaketa-deialdi zehatzik agertu.
[CAPBren udal-fitxak](https://www.communaute-paysbasque.fr/linstitution/les-infos-sur-ma-commune/ma-commune/amendeuix-oneix)
harremanetarako datuak ematen ditu, baina ez du udal-enplegu orririk adierazten.

Worktree honetatik egindako HTTPS eskaerek ziurtagiriaren balioztatzean huts
egin dute; HTTP eskaerek 403 itzuli dute. Horregatik, webgunearen edo artxiboaren
estaldura osoa ezin da baieztatu. Ez da udal-deialdirik bere agiri ofizialekin
batera egiaztatu, eta ez da scraper-rik edo fitxarik gehitu. Amendeuix-Oneix
`pending` mantendu da; berrikuspenak ez du lanpostu hutsik ez dagoela frogatzen.

## Amorots-Succos: udal-enplegu iturriaren berrikuspena

2026-11-27an [CAPBren udal-fitxa ofiziala](https://www.communaute-paysbasque.fr/linstitution/les-infos-sur-ma-commune/ma-commune/amorots-succos),
[Estatuko udal-direktorioa](https://lannuaire.service-public.gouv.fr/nouvelle-aquitaine/pyrenees-atlantiques/7fd8a649-1520-469a-9d57-4840c4861575)
eta [BANATICeko 64019 udal-fitxa](https://www.banatic.interieur.gouv.fr/commune/64019-Amorots-Succos)
kontsultatu dira. CAPBren eta Estatuko fitxek harremanetarako datuak ematen
dituzte, baina ez dute udal-webgunerik edo udalaren kontratazio-atalik
adierazten. BANATICek udalaren 216400192 SIRENa eta CAPB elkargoaren
200067106 SIRENa bereizten ditu; bertako «Emploi» atala biztanleen jarduera-
eta langabezia-tasei buruzkoa da, ez lan-eskaintzei buruzkoa.

CAPBko fitxan ageri den [«Nos offres d'emploi» esteka](https://www.communaute-paysbasque.fr/linstitution/nos-offres-demploi)
elkargoaren kontratazio-espaziora doa, eta ez da Amorots-Succoseko udalaren
enplegu-iturritzat hartu. Emploi Territorial eta CDG 64ren izen bidezko
bilaketetan ere ez da udalaren deialdi zehatzik haren agiri ofizialekin batera
egiaztatu. Bilaketa horiek ez dute artxibo osoa estaltzen. Udalerria `pending`
mantendu da, scraper edo fitxa berririk gabe; berrikuspenak ez du lanpostu
hutsik ez dagoela frogatzen.

## ELIKA: fundazioaren enplegu-iturriaren berrikuspena

2026-11-27an [ELIKAren webgune ofiziala](https://www.elika.eus/es/),
[gardentasun-ataria](https://www.elika.eus/es/transparencia/) eta
[«Personas» orria](https://www.elika.eus/es/conocenos/personas/) zuzenean
kontsultatu dira (HTTP 200). [Robots.txt fitxategiak](https://www.elika.eus/robots.txt)
bilketa baimentzen du. Langileen orriak hamar profesionaleko taldea azaltzen du;
ez du lanpostu hutsen edo hautaketa-prozesuen zerrendarik ematen.

[Sitemap ofizialeko](https://www.elika.eus/sitemap_index.xml) orri eta
albiste URLak berrikusi dira. Bertan aurkitutako «convocatoria» izeneko
albisteetako adibideak ikerketako finantzaketa, prestakuntza edo batzorde
zientifikoko parte-hartzeari buruzkoak dira; ez dira ELIKAren langileentzako
deialdi egiaztatuak. Berrikusitako nabigazioan ez da langileen kontratazio-atal
bereizirik identifikatu. Ez da ELIKAren lanpostu-deialdi zehatzik bere
hautaketa-agiri ofizialekin batera egiaztatu. `pending` egoera mantendu da,
scraper edo fitxa berririk gabe. Honek ez du eskaintzarik eza edo enplegu-
iturri guztien estaldura frogatzen.

## EGO: gazte-orkestrako entzunaldien eta enpleguaren bereizketa

2026-11-27an Euskadiko [erakunde-direktorioan](https://www.euskadi.eus/entidad/fundacion-joven-orquesta-euskal-herria-ego/web01-a2ogafin/es/)
EGOri esleitutako `egofundazioa.org` helbideak
[fundazioaren egungo webgunera](https://www.egofundazioa.eus/es/) birbideratzen
duela egiaztatu da. Hasierako orria, [«Somos EGO»](https://www.egofundazioa.eus/es/somos-ego),
[2026ko «Audiciones»](https://www.egofundazioa.eus/es/audiciones) eta
[gardentasun-orria](https://www.egofundazioa.eus/es/transparencia) zuzenean
eskuratu dira (HTTP 200). Aurreko prospekzioak ezin izan zuen webgunea ireki;
oraingo berrikuspenak oztopo hori argitu du.

Fundazioak bere xedea gazteentzako orkestra-prestakuntza gisa aurkezten du.
2026ko entzunaldien oinarriek eta emaitzek instrumentistak EGOko kide eta
instrumentisten poltsako partaide izateko hautatzen dituzte; izena emateko
aldia 2026-03-06tik 2026-04-17ra zen. Ez da orri hori fundazioko langileen
lanpostu-deialdi gisa inportatu. Gardentasun-orrian gobernantza, egitura eta
urteko kontuak daude, baina berrikusitako edukian ez da langileen hautaketa-
deialdi zehatzik aurkitu. Ez da halako deialdirik haren hautaketa-agiri
ofizialekin batera egiaztatu; EGO `pending` mantendu da, scraper edo fitxa
berririk gabe. Berrikuspenak ez du lanpostu hutsik ez dagoela edo enplegu-
iturri guztien estaldura frogatzen.
