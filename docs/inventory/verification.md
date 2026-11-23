# Inbentarioaren integrazioaren egiaztapena

Data: 2026-11-20. Egiaztapen hauek gehitutako konektoreei eta egungo APIaren
integrazioari dagozkie; ez dute inbentario osoa amaitutzat ematen.

| Egiaztapena | Emaitza |
| --- | --- |
| Aplikazioaren produkzio-builda | Zuzena, Dockerfileko `runner` irudia Podman bidez eraikita. |
| Bilketa-irudia | Zuzena, `importer` irudia eraikita eta scraper moduluak edukiontzian kargatuta. |
| TypeScript | `npm run typecheck`: errorerik ez. |
| Parserren eta logikaren probak | `npm test`: 174 proba gaindituta. |
| APIaren eta frontend-aren integrazioa | `tests/browser/api-front.spec.ts`: 7 proba gaindituta Chromium erabiliz. |
| Lint | Proiektuak ez du lint komando konfiguraturik. |
| Kode-estaldura | Ez da ehunekorik neurtu egiaztapen honetan. |
| Diffaren formatua | `git diff --check`: errorerik ez. |
| Token ezagunen formatua duten kateak | Ez da susmagarririk aurkitu berrikusitako kodean eta dokumentazioan. |
| `src/` barruko `console.log` | Ez da aurkitu. |

Nabigatzaileko proba-multzoak API publikoa, CORS, erroreen kudeaketa,
berriro saiatzea, orrialdekatzea, fitxa osoak, Swaggerreko sei endpointak eta
mugikorreko irisgarritasun egiaztapen automatikoa hartzen ditu. Ez dira
`tests/browser/` direktorioko gainerako proba-multzoak exekutatu.

Nafarroako CSV sinkronizazioak osatugabeko sarrera baztertzen duela ere
egiaztatu da, inbentarioa aldatu gabe. 252 udalerri Euskadin, 272 Nafarroan eta
158 commune Iparralden mantentzen dira.

Segurtasun-berrikuspena kanpoko kontsulten hosten baimenei, HTTPS mugari,
birbideratzeei, `robots.txt` arauei, dokumentuen tamainari eta denbora-mugei
dagokie. Emploi territorial-eko saio anonimoa memorian soilik mantentzen da;
ez da autentifikazio edo hautagaitza-formulariorik bidaltzen. Berrikuspen hau
ez da aplikazio osoaren segurtasun-auditoria.

APIan egiaztatutako kontsulta honetako kopuruak:

| Iturria | Fitxak |
| --- | ---: |
| Kabia | 27 |
| Alokabide | 98 |
| Musikene | 1 |
| Biogipuzkoa | 79 |
| Andoain | 8 |
| Hernani | 31 |
| Zizurkil | 3 |
| Elgoibar | 20 |
| Hondarribia | 6 |
| Ibarra | 6 |
| Orio | 28 |
| Emploi territorial | 44 |
| Choisir le service public | 52 |
| Open Data Euskadi/IVAP: Nafarroako hedapena | 164 |
| Navarrabiomed–Miguel Servet Fundazioa | 2 |
| Gizain Fundazioa | 15 |
| Itelazpi | 1 (historiko itxia) |
| Parlamento de Navarra | 6 |
| Miguel Induráin Fundazioa | 1 |
| Baluarte Fundazioa | 0, prozesu irekirik ez duela dio |
| Udal-egoitzaren hedapena: beste 13 udal | 44, Aramaren modulua hutsik |
| Leioa | 6 |
| Berrioplano / Berriobeiti | 8 |
| Orkoien | 15 |
| Mañeru | 2 |
| Osatek | 6 |
| La Sécu recrute | 6 |
| Euskalmet | 4 |
| NEIKER | 20 |
| Arkaute | 3 |
| Baztan | 2 |
| Estella-Lizarra | 12 |
| Valle de Egüés / Eguesibar | 6 |
| Cámara de Comptos | 2 |
| SCPSA / MCP | 12 |
| Valdizarbe | 8 |
| BON: toki-administrazioaren azken 90 egunak | 56 |
| Mairaga | 2 |
| Ribera / SERINSA | 2 |

Nafarroako hedapeneko 164 fitxek `territory=Navarra` eta `province=Navarra` dituztela
egiaztatu da API publikoan `source=euskadi&province=Navarra` erabiliz.

Katalogoak 2158 fitxa ditu auditoretzaren unean. Inbentarioko 895 sarreretatik
258ekin bat datozen fitxak aurkitu dira; gainerako 637ek ez dute izenarekin
bat datorren fitxarik auditoretza honetan. Ez da horretatik eskaintzarik eza edo
637 konektore berri behar direla ondorioztatzen. Xehetasunak eta dataren marka
`coverage-summary.json` eta `README.md` fitxategietan daude.

Azken blokeko irudiak: `runner` bf849d072fa4 eta `importer` 523f0ca337f5.
APIak `navarra-parliament`, `miguel-indurain`, `baluarte` eta udal berrien
iturrien iragazkiak onartzen dituela egiaztatu da. Oinarrietako gradu orokorra
ez da arkitekturako espezialitate gisa sailkatzen.


Azken egiaztapenek `leioa`, `berrioplano`, `orkoien`, `maneru`, `osatek` eta
`la-secu-recrute` iturrien API-iragazkietan HTTP 200 eta goiko kopuruak baieztatu
dituzte. Berrioplanoko liburutegiko zerrendaren C1 derrigorrezkoa eta 10 gaiak
fitxa osoaren endpoint-ean egiaztatu dira. Orkoiengo gitarra-ikasketek ez dute
FP erdi-mailako bat-etortze faltsurik sortzen.

HTTPko proba berriak `crawl-delay` jatorri berean errespetatzen dela eta beste
zerbitzari batera zabaltzen ez dela frogatzen du, kanpoko sarerik gabe.
Osatek eta Mañeruko eskaneoen berrikuspenak URL eta SHA-256 zehatzekin lotzen
dira; checksum desberdineko dokumentuetan ez dira berrerabiltzen. Mañeruko
SNEko aurretiko inskripzio-data ez da CVa entregatzeko epea.

Hautaketa-prozesuen azken ziklo osoa amaitzen utzi da irudi berrietara
aldatu aurretik. Berrioplanoko C1 zuzenketarako bilketa-edukiontzia berreraiki
eta ordezkatu da, ondorengo zikloaren hasieran; aplikazioaren eta PostgreSQLren
datuak mantendu dira. Zuzenketaren ondoren APIko fitxan C1 eta `languageStatus=known`
baieztatu dira.

Euskalmet eta NEIKER iturrien API-iragazkiak egiaztatuta daude (4 eta 20 fitxa).
Euskalmeteko 2026-11-12ko epe amaitua eta euskarako B2 baldintza baieztatu dira.
NEIKERen alegazio-datak ez dira inskripzio-epe gisa itzultzen. Azken produkzio-
irudiekin nabigatzaileko zazpi integrazio-probak berriz gainditu dira.

Arkaute, Baztan eta Estella-Lizarrako API-iragazkiek HTTP 200 eta 3/2/12 fitxa
itzultzen dituzte. Fitxa osoetan Arkauteko 327/593 plazak, 54/44 gaiak eta
poltsako euskara merezimendua egiaztatu dira. Baztango bi C1 baldintzak eta
21na gaiak, eta Estellako sei gai-zerrendak ere baieztatu dira. Automatikoki
eguneratzeko bilketa-irudi berriak 70 iturriak ezagutzen ditu. Aldaketa hauekin
produkzio-irudia berreraiki eta nabigatzaileko 7 probak berriz gainditu dira.
Oinarri irakurtezinak edo identifikatu gabeko estekak txostenetan jakinarazten
dira, ez hutsik dauden edo baldintzarik gabeko deialdi gisa.


2026-11-20ko blokean Cámara de Comptos eta SCPSAren API-iragazkiek 2 eta 12
fitxa itzuli dituzte. Fitxa osoetan Comptoseko 26/73 gaiak, ESO/gradu orokorra,
eta 2025eko prozesuaren egoera itxia baieztatu dira. SCPSAko hamar gaitegi eta
fase kanpoko epe absolutuak egiaztatuta daude, webeko erakusketa-datak erabili
gabe. Bitarteko postuko titulazio orokorrak ez dira Arkitektura gisa sailkatzen;
aurretik gordetako fitxen normalizazioak ere zuzenketa aplikatzen du.

Nabigatzaileko lehen exekuzioan proba batek 5 segundoko itxaronaldia gainditu
du katalogoaren karga hotzean; gainerako seiek gainditu dute. Kodea edo probaren
itxaronaldia aldatu gabe, multzo osoa berriz exekutatuta 7/7 gainditu dira
(10,6 s). Katalogoa orrialdeka osorik kargatzen jarraitzen du bezeroak.

Navarrako direktorioen parserrek TRACASA eta TRACASA Instrumental bereizten
dituzte, URL arriskutsuak baztertzen dituzte eta ez dute IFZrik edo kontaktu
pertsonalik esportatzen. Python tresnaren URL-iragazkia eta CSV osatugabeen
babesa ere egiaztatu dira, inbentarioa aldatu gabe. `modern-web-guidance`
tresnan JavaScript gida kontsultatu da; titulazioen zuzenketa testu-analisi hutsa
da, eta ez du nabigatzaileko API berririk edo plataforma-aldaketarik behar izan.

BON iturria eta titulazio berriak dituen irudian zazpi API/frontend probek
12,2 segundoan gainditu dute multzoa. APIak 72 iturri onartzen ditu.
Valdizarbeko administrari-prozesuan gaizki estekatutako ingeniaritzako
oinarriak baztertu dira; dagokion 19 gaiko eranskina mantentzen da.

Salud Navarra atariko oposaketen 45 esteka modernoetatik 42 Nafarroako
iturriko katalogoan aurkitu dira. Beste hirurek emaitzen edo izendapenen
fasea erakusten dute; hiru HTTP esteka historiko gehigarri ez dira jarraitu.
Ez dira kontaktu-PDFak edo zerbitzu administratiboak eskaintza bihurtzen.
Altsasuko gradu orokorraren baliokidetza ez da Arkitekturako azpiaukera
bihurtzen: aurretik huts egiten zuen erregresio-proba gehitu da.

Mairagaren irudiarekin zazpi API/frontend probak 12,5 segundoan gainditu
dira. APIaren 73 iturrien artean `mairaga` HTTP 200 bidez egiaztatuta dago.
Montejurra-ko cookie/birkarga erronka ez da estekarik gabeko eduki irakurgarri
gisa sailkatzen; erronka ez da gainditzen. Riberako 2024ko bi enplegu-albiste
aurkitu dira bigarren mailako taulan; oinarrien integrazioa egiteke dago.
DILAren direktorio-APIak `robots.txt` bidez eskaera ukatu du; ez da hortik
Iparraldeko erakunde bakoitzaren kontratazio-ataria blokeatuta dagoela ondorioztatu.

Riberako benetako PDFen maketazioak eragindako bi kasu estali dira:
`Base 2. –Requisitos` atalburuko tartea eta aurreko lerroko lege-aipu bat
jarraitzen duen `21. CAPÍTULO` testua. Azken hori ez da 21. gai faltsua:
administrariaren 11 gaiak eta zaintzaileen 6 gaiak oso-osorik mantentzen dira.

Riberaren irudiarekin zazpi API/frontend probak 11,8 segundoan gainditu
dira. `ribera` iturriak bi fitxa ematen ditu HTTP 200 bidez, eta bi oinarriek
egiaztapen-data eta SHA-256 dituzte. APIak 74 iturri erregistratu ditu.

Euskadiko direktorioaren berrikuspenak 120 erakundeak alderatu ditu: 53 web
baieztatuta, 2 web argitaratu gabe, 2 eskuz berrikusteko eta 63 bat-etortze
argirik gabe. `INVENTORY_TERRITORY=Euskadi` aukerak ez du CPEN kontsultatzen;
213 erakundeko inbentarioa eta Nafarroako datuak mantentzen ditu. Balio
okerreko lurraldea baztertzen dela egiaztatu da, inbentarioa aldatu gabe.

Arabako hedapena: argitaratutako zerrenden orrialdekatzea, 180 eguneko
21 iragarki eta 14 PDF egiaztatuta. IFJren 40 gaiak, Batxilergo/LH aukerak
eta Samaniegoko ziurtagiria, B gidabaimena eta euskera ez derrigorrezkoa
benetako PDFekin egiaztatu dira. Hizkuntza-hautatzailea eta orri barruko
estekak ez dira orrialde berritzat hartzen. Liferayren itzulera-parametroak
ez du fitxaren identitatea aldatzen beste orrialde batera igarotzean.

Euskadiko lurralde-berreskurapena: 39 fitxa berri egiaztatu eta inportatu
dira (22 Euskadi, 17 Nafarroa), aurrekoak ezabatu gabe. 27k jatorrizko
oinarrietarako estekak dituzte; berrikuspen partzial honetan ez dira haien
PDFak deskargatu edo temario berriak egiaztatutzat eman. Kontsulta
osoaren txostenetik bereizita gorde da cache ofizialaren froga.

Euskadiko bilketa osoa ere amaitu eta inportatu da: 756 hautagaitik 682 fitxa,
aurreko erregistroak ezabatu gabe. Web/PDF sarbideko edo lurraldearen
egiaztapeneko 195 gorabehera jakinarazi dira. Fitxa partzialen eta bilketa
osoaren frogak bereizita mantentzen dira. Irudi berriak: aplikazioa
`bf849d072fa4`, bilketa `523f0ca337f5`. API/frontend probak berriz gainditu
dira: 7/7 (11,7 s). Azken auditoria: 2.202 fitxa; inbentarioko 263
sarreratan erregistroak aurkitu dira eta 632tan ez, estaldura osoa aldarrikatu gabe.

Nafarroako Arartekoa: langileen ataleko deialdi propio bakarra, PDFaren SHA-256
egiaztatuta. Batxilergoa/LH II, Parlamentuko funtzionario-lotura eta 2023-01-11ko
epe amaitua baieztatu dira; merituen titulazioak ez dira sarbide-baldintzatzat
hartzen, eta hautagaien dokumentuak ez dira deskargatzen. Hiru erregresio
berriak eta gainerako probak gaindituta: 167/167; TypeScript errorerik gabe.

IVAPen nabigazio-izenburua erabiltzeko akatsa zuzenduta dago. Fitxako
`plaza`/`puesto` eremua eta argitaratutako zerrendako izenburua lehenesten
dira; erakunde deitzailea `¿Quién oferta?`/`Convoca`/`Ofertante` eremuetatik
hartzen da, autonomia-erkidegoko administrazioa asmatu gabe. Lotutako
PDFak ez dira deskargatutzat ematen. Bi erregresio berriak eta multzo osoa
gaindituta: 169/169, TypeScript errorerik gabe.

HAZI: hiru benetako profil eta bi egutegi PDF, SHA-256 egiaztatuta.
5/3/4 gai-blokeak, C1 baldintza, ADE/Derecho aukerak eta titulazio
sektorialaren zuhurtasuna egiaztatu dira. Egutegiaren eta oinarrien
2026-11-19/20 gatazkak ez du epe ireki asmatua sortzen. Orriko H2
aldaera eta orrialde-jauzietan zatitutako gaiak ere estalita daude.

Anglet Tourisme: 2 PDF eskaneatu bisualki irakurri eta SHA-256 bidez
egiaztatu dira; 2025-08-22ko epea, Angleteko destinoa eta itxitako
egoera gorde dira. Azken exekuzioan 174/174 parser-proba eta TypeScript
ondo; 77 iturri erregistratuta. SDIS 64ren iragarkiek ez dute
Iparraldeko destino zehatzik frogatu.
