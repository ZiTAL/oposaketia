# Oposaketia

Euskal Herriko enplegu publikoa bilatzeko webgunea: Euskadiko, Nafarroako eta
Iparraldeko deialdiak biltzen ditu, konturik sortu gabe. Ikasketak, hizkuntzak,
bilaketak eta gogokoak nabigatzaileko `localStorage` biltegian gordetzen dira.
Deialdien katalogo partekatua PostgreSQL datu-basean gordetzen da.

Webgunea euskaraz, gaztelaniaz eta frantsesez erabil daiteke; euskara da hizkuntza
lehenetsia. API publikoaren dokumentazioa, endpoint nagusiak eta errore-mezuak
ingelesez daude. Iturri ofizialetako edukiak jatorrizko hizkuntzan mantentzen dira.

Next.js, React, TypeScript, Tailwind CSS, PostgreSQL eta Nginx erabiltzen ditu.
Hedapena Docker Compose eta Podman erabiltzeko prestatuta dago.

## Docker edo Podman bidez abiaraztea

Proiektuaren erroko direktoriotik:

```sh
cp docker/.env.example docker/.env
```

Ezarri ausazko pasahitz alfanumeriko bat `POSTGRES_PASSWORD` aldagaian. Ez igo
`docker/.env` Git-era: `.gitignore` fitxategiak baztertzen du. Datu-basearen
bolumena sortu ondoren, pasahitza aldatzeko PostgreSQL erabiltzailearena ere
aldatu behar da. Ataka lehenetsia `8080` da.

Docker Compose erabiliz:

```sh
docker compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" up -d --build
```

Podman eta `podman-compose` erabiliz:

```sh
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" up -d --build
```

- Webgunea: <http://localhost:8080>
- Euskarazko interfazea: <http://localhost:8080/eu>
- Iturriak eta estaldura: <http://localhost:8080/eu/fuentes>
- Zerbitzuaren egoera: <http://localhost:8080/health>
- Swagger: <http://localhost:8080/api/docs>

Bide absolutuek Compose hornitzaile batzuen direktorio-arazoak saihesten dituzte.
Zerbitzuak gelditzeko, ordezkatu `up -d --build` zatia `down` aginduarekin.
`down` aginduak bolumenak mantentzen ditu; `down -v` aginduak ezabatu egiten ditu.

### Zerbitzuak

| Zerbitzua | Eginkizuna |
| --- | --- |
| `web` | Nginx. Kanpora argitaratutako ataka bakarra du. |
| `app` | Next.js aplikazioa, standalone moduan eta pribilegiorik gabeko erabiltzailearekin. Osasun-egiaztapenak katalogorako sarbidea behar du. |
| `db` | PostgreSQL 17, bolumen iraunkorrarekin eta kanpora argitaratutako atakarik gabe. |
| `init` | Taula sortzen du; adibideak `DEMO_MODE=true` denean soilik inportatzen ditu. |
| `scraper` | Iturri ofizialak kontsultatu eta datuak zuzenean PostgreSQL-n gordetzen ditu. |
| `updater` | JSON fitxategien aukerako inportatzailea, Compose-ko `import` profilean. |

`init`, `scraper` eta `updater` zerbitzuek `oposaketia-importer:local` irudia
partekatzen dute. PDF fitxategiak `pdftotext` tresnarekin prozesatzen dira;
irudiak Poppler barne hartzen du. Lehen datu-bilketak hainbat minutu iraun dezake.
Iturri baten hutsegiteak ez ditu gainerako iturrietako datuak ezabatzen.

## Katalogoa eguneratzea

`scraper` zerbitzuak abiaraztean egiten du lehen bilketa. Bilketa bakoitza
amaitu eta sei ordura berriro exekutatzen da. Tartea `docker/.env` fitxategiko
`SCRAPE_INTERVAL_SECONDS` aldagaiaren bidez ezartzen da: `21600` lehenespenez,
eta gutxienez `3600`. Aldaketa aplikatzeko, birsortu `scraper` edukiontzia.

Hedapen honetako eguneratzea berehala abiarazteko:

```sh
podman restart oposaketia_scraper_1
```

Aurreko bilketa martxan badago, utzi amaitzen berrabiarazi aurretik.
Exekuzioaren jarraipena egiteko:

```sh
podman logs -f oposaketia_scraper_1
```

Compose bidez ere ikus daitezke erregistroak:

```sh
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" logs -f scraper
```

Emaitzak, azken kontsulta-datak eta estaldura-mugak webguneko iturrien orrian
eta `GET /api/v1/sources` endpoint-ean ikus daitezke. Iturri batek huts egiten
badu, haren aurreko fitxak mantentzen dira.

## Konektatutako iturriak eta mugak

| Iturria | Konektorearen estaldura |
| --- | --- |
| Open Data Euskadi / IVAP | `empleo_publico_otras_ope` katalogoko Euskadiko fitxak. Azken 90 egunetako edo etorkizuneko epeak hartzen ditu; udalerrietan, azken 12 hilabeteak, Bilbo, Getxo eta Barakaldo barne. Bilboko LEP atariak ez du zuzeneko scraping-a baimentzen, eta hango fitxak Euskadiko katalogo ofizialetik jasotzen dira. Ez ditu erakunde bakoitzeko prozesu guztiak estaltzen. |
| Lanbide | Enplegu publikoa ataleko Euskadiko eta Nafarroako eskaintzak, orrialde guztietatik. Erakunde deitzailea mantentzen du. Fitxan falta diren baldintzak, epeak eta gai-zerrendak egiaztatzeko geratzen dira; Lanbideren berezko lan-poltsek dagokien atariko oinarriak eta epea ere jasotzen dituzte, lotura baieztatzen denean. |
| Vitoria-Gasteizko Udala | 22-24ko LEPeko lanpostuak, lanpostu bakoitzaren oinarri espezifikoak eta prestakuntza-materialak. Ez ditu barne-deialdiak jasotzen. |
| Euskotren | Enplegu-atari publikoko lanpostuak, baldintzak eta oinarri eta materialen estekak. Epeak eta egoera egiaztatzeko geratzen dira; ez ditu gai-zerrenda espezifikoak ateratzen. |
| EITB | Prozesu irekien orriko deialdi publikoak eta lan-poltsetarako probak, baldintza eta gai-zerrenden esteka ofizialekin. |
| Arabako Enplegu Publikoaren Ataria | Aldundiaren, foru-sektore publikoaren eta Arabako toki-erakundeen azken iragarkiak. Toki-erakunde batzuek beren prozesuak jakinarazi gabe izan ditzakete. |
| Donostiako Udala | Udal-atariaren «En plazo» atalean agertzen diren deialdiak, baldintzekin eta dokumentuen estekekin. |
| EHU | Langile teknikoen, kudeaketakoen eta administrazio eta zerbitzuetakoen LEPa. Eskala bakoitzaren baldintzak, oinarri espezifikoak eta dokumentuak estekatzen ditu. |
| IVAP | IVAPek zabaldutako eskaintzen bilatzailearen lehen orria, tokiko eskaintzak barne. Fitxak, plazak, epeak, baldintzak eta dokumentuak jasotzen ditu. Ez ditu hurrengo orriak arakatzen, `robots.txt` fitxategiak orrialdekatzea baztertzen duelako. |
| Osakidetza | 2023-2024-2025eko LEPeko hautaketa-atari publikoko kategoriak. Kategoria bakoitza irekitzeko interakzioa behar da; oinarri orokorrak eta bibliografia komuna estekatzen dira, eta xehetasunak Osakidetzan kontsultatu behar dira. |
| Nafarroako Gobernua / NAO | Bilatzaile ofizialeko orrialde guztiak eta epea zabalik edo ebazteko bidean duten fitxak. Baldintzak, arau-estekak eta NAOko gai-zerrenden eranskinak jasotzen ditu. Amaitutako izapideak kanpoan uzten ditu. |
| CDG 64 | Nouvelle-Aquitaine eskualdeko azken behin-behineko egutegian kanpoko sarbidea duten lehiaketak. Izenburuaren arabera gida orokorrak lotzen ditu ahal denean. Ez du Iparraldeko plazarik edo destinorik baieztatzen. |

Iturri ofizialak:

- [Open Data Euskadi](https://opendata.euskadi.eus/catalogo/-/oferta-publica-de-empleo-ope-de-otras-administraciones-publicas-vascas/)
- [Lanbideko enplegu publikoa](https://web.lanbide.eus/apps/OF_RES_BUSQUEDA_OFERTAS?CTRG=3&LG=C&ML=OFEMEN1&MS=Eaa&ORDN=11&RG=1&RP=10)
- [Vitoria-Gasteizko hautaketa-prozesuak](https://www.vitoria-gasteiz.org/procesosselectivos)
- [Euskotrenen enplegu-ataria](https://euskotren.iformalia.es/)
- [EITBren deialdi publikoak](https://www.eitbtaldea.eus/es/convocatoria-publica.php)
- [Arabako toki-administrazioko enplegua](https://enplegupublikoa.araba.eus/es/administracion-local)
- [Donostiako udal-enplegua](https://www.donostia.eus/es/desarrollo-economico-empleo/ofertas-empleo-municipales)
- [EHUren LEPa](https://www.ehu.eus/es/web/azp/epe-2023_24)
- [IVAPeko enplegua](https://www.ivap.euskadi.eus/empleo-ivap/)
- [Osakidetzaren LEPa](https://www.osakidetza.euskadi.eus/ope-2023-2024-2025/webosk00-procon/es/)
- [Nafarroako deialdiak](https://www.navarra.es/es/empleo-publico/convocatorias)
- [CDG 64ren egutegiak](https://www.cdg-64.fr/concours-et-examens/calendriers-et-brochures-dinformations/calendriers-et-informations-generales/)

**Estaldura partziala da.** Eskualdeko egutegi frantsesa ez da deialdi ireki gisa
agertzen, eta ez zaio Iparraldeko destinorik esleitzen hori baieztatu gabe. Gida
orokorrak ez dira saio jakin bateko gai-zerrenda gisa aurkezten. Oraindik ez dira
administrazio, osasun-erakunde, hezkuntza-erakunde eta estatuko enplegu publiko
guztiak integratu.

## Scraping-aren funtzionamendua

- Baimendutako domeinuen zerrenda esplizitu bateko iturri ofizialak erabiltzen ditu.
- `robots.txt` errespetatzen du; maiztasuna, tamainak, denborak eta birbideratzeak
  mugatzen ditu, eta aldi baterako hutsegiteak berriz saiatzen ditu. Ez du saiorik
  hasten, ez nabigatzailerik erabiltzen. Ez ditu hautagaien zerrendak edo izenezko
  emaitzak jarraitzen.
- Erantzunak cachean gordetzen ditu, eta iturriak eskaintzen dituenean ETag eta
  Last-Modified erabiltzen ditu. Orrien karaktere-kodeketa errespetatzen du,
  Latin-1 dokumentuak barne.
- Uneko fitxaren izenburua lehenesten du katalogokoaren aurretik, aldatu bada.
- URL ofiziala, kontsulta-data, edukiaren aztarna eta dokumentuak gordetzen ditu.
  `scrapedAt` kontsulta automatikoari dagokio; `verifiedAt`, giza berrikuspenari.
- Titulazioak esamolde esplizituak ezagutzen dituenean soilik esleitzen ditu.
  Lanpostuaren izena edo taldea ez da nahikoa. Ez ditu PL1–PL4 automatikoki
  Europako mailetara bihurtzen, ezta Espainiako eta Frantziako tituluen arteko
  baliokidetasunak ondorioztatzen ere.
- Izen-ematea zabalik egotea, prozesua martxan egotea, itxiera, data ezezaguna eta
  egutegia bereizten ditu. Ez ditu alegazio-epeak izen-ematearen epeekin nahasten,
  eta ez ditu lanegunetan adierazitako epeak kalkulatzen.
- Gai-zerrendek dokumentu ofizialera eramaten dute. Egitura ezagutzen denean,
  NAOko eranskinetako gaiak ere ateratzen ditu; laburpenak atalak eta zuzenketak
  falta izan ditzake. Hainbat lanpostu dituen oinarrien PDFa ez zaio automatikoki
  gai-zerrenda bakar bati esleitzen. Blokeatutako PDFak estekatuta geratzen dira.
- Identifikatzaile egonkorrez baliozkotu eta inportatzen du, iturri bakoitzeko
  transakzio batean. Ez ditu desagertutako fitxak ezabatzen. Epea amaitu zaien
  deialdi irekiak itxita erakusten ditu. Beti kontsultatu jatorrizko oinarriak
  izena eman aurretik.

Txostenak `scrape_sources` taulan gordetzen dira. Saiakera bakoitzak emaitza
jasotzen du eta datuak eskuratu diren azken saiakeraren data mantentzen du.
Inportazio partzial batean dokumentuak edo fitxak irakurtzeko zain gera daitezke.
Xehetasunak logetan eta `scrape-report.json` fitxategian gordetzen dira.

## Eskuzko bilketa eta inportazioa

Node.js 24, npm eta `pdftotext` instalatuta:

```sh
npm ci
npm run scrape
```

`DATABASE_URL` ez badago, emaitzak `data/imports/catalogue.json` eta
`data/imports/scrape-report.json` fitxategietara esportatzen dira. Aldagaia
ezarrita badago, datuak eta txostena datu-basean ere gordetzen dira.
Komandoak ez du PostgreSQL abiarazten.

Konfigurazioa:

- `SCRAPE_SOURCES=euskadi,eitb,araba,donostia,ehu,ivap,osakidetza,euskotren,vitoria,lanbide,navarra,cdg64`: erabili beharreko konektoreak.
- `SCRAPE_INTERVAL_SECONDS=21600`: zerbitzuaren tartea, gutxienez 3600 segundo.
- `SCRAPE_OUTPUT_DIR=data/imports`: esportazio-direktorioa.
- `SCRAPE_CACHE_DIR=data/scrape-cache`: erantzunen cachea.

Edukiontzian, hedapena abiatuta dagoela eta ohiko `scraper` zerbitzua geldituta,
bilketa paraleloak saihesteko:

```sh
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" stop scraper
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" run --no-deps --rm -T scraper npm run scrape
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" start scraper
```

Proxy bat duen sarean, gehitu `-f "$(pwd)/docker/docker-compose.proxy.yml"`.
Ez exekutatu hainbat bilketa aldi berean esportazio-direktorio berean.
Aurretik bildutako esportazioa eta haren txostena aplikatzeko:

```sh
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" run --no-deps --rm -T -v "$(pwd)/data/imports:/imports:ro,Z" init node_modules/.bin/tsx scripts/apply-scrape.ts /imports
```

Eskuz berrikusitako JSON baterako: `npm run db:import -- fitxategia.json`.
Formatua eta baliozkotzea `src/lib/catalogue.ts` fitxategian daude;
`data/demo.json` fitxategiak adibideak ditu. Kontsulta trazagarririk edo
berrikuspenik gabeko benetako datuak baztertzen dira. Aukerako `import` profilak
`data/imports/catalogue.json` aldizka inporta dezake, `IMPORT_INTERVAL_SECONDS`
aldagaiaren arabera, gutxienez 60 segundoko tartearekin.

## Proxy-a edo ziurtagiri propioa duen sarea

Irudiak eraikitzean `npm_ca` aukerako sekretua erabil daiteke; instalazioan soilik
muntatzen da. Inguruneak `NODE_EXTRA_CA_CERTS` definitzen badu, adibidez:

```sh
podman build --network host --secret id=npm_ca,src="$NODE_EXTRA_CA_CERTS" -f docker/Dockerfile --target runner -t oposaketia_app .
podman build --network host --secret id=npm_ca,src="$NODE_EXTRA_CA_CERTS" -f docker/Dockerfile --target importer -t oposaketia-importer:local .
```

Exekuzioan iturrietara sartzeko, erabili aukerako override fitxategia.
`HTTP_PROXY`, `HTTPS_PROXY` eta `NO_PROXY` hartzen ditu eta ziurtagiria
irakurtzeko moduan muntatzen du:

```sh
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" -f "$(pwd)/docker/docker-compose.proxy.yml" up -d --no-build
```

TLS egiaztapena aktibo mantentzen da. Ez sartu proxy-aren kredentzialik edo
ziurtagiri pribaturik biltegian edo produkzioko irudian.

## Garapena eta egiaztapenak

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Beste terminal batean:

```sh
npm run typecheck
npm test
npm run build
```

`.env.example` fitxategiak adibideko datuak aktibatzen ditu datu-baserik gabeko
garapenerako. Hedapen arruntean, `DEMO_MODE=false` balioak bolumenean egon
daitezkeen adibideko fitxak ezkutatzen ditu. Webguneak `noindex` mantentzen du
argitaratzeko prest dagoela berrikusi arte. Interneten argitaratzeko, konfiguratu
domeinua eta HTTPS hedapenaren proxy-an.

APIaren eta frontend-aren egungo fluxuak Chromium erabiliz egiaztatzeko:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser -- tests/browser/api-front.spec.ts
```

Garapen-zerbitzari baten aurka:

```sh
TEST_BASE_URL=http://localhost:3000 CHROMIUM_PATH=/usr/bin/chromium npm run test:browser -- tests/browser/api-front.spec.ts
```

Chromium instalatuta ez badago, `npx playwright install chromium` komandoak
Playwright-en bertsioa instalatzen du; kasu horretan, kendu `CHROMIUM_PATH`.
Parserren probak deterministak dira eta ez dituzte atariak kontsultatzen.
Nabigatzaileko API-probek CORS, orrialdekatzea, Swagger bidezko kontsultak,
bilaketa, profil lokala, berriz saiatzea, teklatua eta mugikorreko
irisgarritasuna egiaztatzen dituzte. `tests/browser/` direktorioan aurreko
fluxuetarako proba-multzoak ere badaude.

## Ikasketak, probintziak eta iragazkiak

Ikasketa-mailak hainbat aukera hautatzeko aukera ematen du. Unibertsitateko
ikasketen barruan 19 titulazio edo espezialitate daude: Erizaintza, Medikuntza,
Fisioterapia, Zuzenbidea, Psikologia eta Ingeniaritzako hainbat adar, besteak beste.
Espezialitateak ez dira maila orokor gisa erakusten. Ez da titulazio bat
lanpostuaren izenetik ondorioztatzen; argitaratutako baldintzetan egon behar du.

Probintzia bat baino gehiago hauta daiteke aldi berean: Araba, Bizkaia, Gipuzkoa,
Nafarroa, Lapurdi, Nafarroa Beherea eta Zuberoa, baita «Eremu orokorra / zehaztu
gabe» ere. Ez dago lurraldeetarako aparteko iragazkirik. Hautatutako aukeretako
edozeinetan dauden fitxak erakusten dira; hautaketa hutsak katalogo osoa erakusten
du. Hautaketa nabigatzailean gordetzen da.

Konektoreek `province` eremua iturriko probintzia-izen edo kode esplizituetatik
betetzen dute. Nafarroa probintzia bakartzat hartzen da. Datuak kontraesankorrak
badira edo eskualde orokorra soilik adierazten badute, `province=null` mantentzen
da. Nouvelle-Aquitaine eskualdeko egutegiari ez zaio Iparraldeko tokiko destinorik
esleitzen hori baieztatu gabe. Hautatutako Iparraldeko probintzietan fitxarik ez
badago, interfazeak eremu orokorra ere sartzeko aukera ematen du.

Egoerak eta kategoriak ere hautaketa anitzekoak dira. Egoera bereko aukera
bakoitza OR bidez konbinatzen da; probintzia, egoera eta kategoria iragazkiak,
berriz, AND bidez. Iragazki bateko «Guztiak» aukerak iragazki hori soilik garbitzen
du. Profil zaharrak migratzen dira ikasketak, gogokoak eta aurreko hautaketak
galdu gabe.

## Interfazearen hizkuntzak

Webgunea euskaraz (`/eu`), gaztelaniaz (`/es`) eta frantsesez (`/fr`) dago.
Gordetako lehentasunik gabeko bisitetan euskara da hizkuntza lehenetsia, baita
hizkuntza-aurrizkirik gabeko erroan ere. EU / ES / FR hautatzailea goiburuan dago,
mugikorrean ere bai, eta uneko orria mantentzen du hizkuntza aldatzean.

Lehentasuna `oposaketia:locale:v1` gakoan gordetzen da, cookie-rik edo konturik
gabe eta profila aldatu gabe. Nabigatzaileak aukera ematen duenean, gordetako
hizkuntza berreskuratzen da; hizkuntza esplizitua duen URLak lehentasuna du.

Interfazea, iragazkien eta titulazioen etiketak, mezuak, datak eta metadatuak
itzultzen dira. Ikasketen, probintzien, egoeren eta kategorien identifikatzaileak
mantentzen dira, hizkuntza aldatzeak iragazkiak edo gogokoak ez galtzeko.
Deialdi ofizialen izenburuak, baldintzak, dokumentuak eta gaiak iturriaren
hizkuntzan agertzen dira.

Itzulpenak `src/lib/i18n/messages.ts` fitxategian daude. `src/proxy.ts` fitxategiak
zerbitzariko HTMLaren hizkuntza ezartzen du. APIak balio egonkorrak erabiltzen
ditu eta ez du hizkuntza-aurrizkirik.

## API publikoa eta Swagger

Irakurtzeko APIa `/api/v1` bidean dago, konturik edo API gakorik gabe, eta
`Access-Control-Allow-Origin: *` CORS goiburuarekin. Swagger, endpoint nagusiak
eta APIaren erroreak ingelesez daude. Deialdi ofizialak, iturrien azalpenak eta
iragazkien balio egonkorrak jatorrizko hizkuntzan mantentzen dira.

Webguneak API hori kontsumitzen du: katalogoa eta iturriak nabigatzaileko `fetch`
bidez; fitxa osoa eta haren metadatuak, zerbitzaritik HTTP bidez. APIaren
handler-ek soilik atzitzen dute PostgreSQL. Webgunearen ikasketak, hizkuntzak,
gogokoak eta bilaketak ez dira iragazteko APIra bidaltzen.

| Baliabidea | Helbidea edo eginkizuna |
| --- | --- |
| Swagger interaktiboa | <http://localhost:8080/api/docs> |
| OpenAPI 3.1 zehaztapena | <http://localhost:8080/api/v1/openapi.json> |
| `GET /api/v1/calls` | Deialdien zerrenda orrialdekatua. Tamaina murrizteko, dokumentu, baldintza eta gaien array-ak hutsik datoz. |
| `GET /api/v1/calls/{id}` | Fitxa osoa eta eskuragarri dauden dokumentuak eta gai-zerrenda. |
| `GET /api/v1/sources` | Iturriak, estaldura eta eguneratze-txosten publikoak. |
| `GET /api/v1/options` | Iragazkietan eta ikasketetan erabil daitezkeen balioak. |
| `GET /api/v1/health` | Zerbitzuaren egoera. |

Zerrendak `q`, `page` (1etik aurrera), `limit` (1–200; 20 lehenespenez) eta
`sort=title|deadline|province|status` onartzen ditu. Hainbat balio hautatzeko,
errepikatu `province`, `category`, `status`, `territory`, `source` edo
`qualification` parametroa. Onartutako balioak `/options` endpoint-ak ematen ditu,
interfazearen hizkuntzatik independente. Iragazki baten barruan OR erabiltzen
da, eta iragazkien artean AND. Probintzia baieztatu gabe duten fitxetarako,
erabili `province=Sin concretar`.

```sh
curl --get 'http://localhost:8080/api/v1/calls' \
  --data-urlencode 'province=Bizkaia' \
  --data-urlencode 'province=Gipuzkoa' \
  --data-urlencode 'status=Abierta' \
  --data-urlencode 'limit=20'
```

Erantzunak `calls` eta `pagination: { page, limit, total, pages }` ditu.
Tartetik kanpoko orriak array hutsa itzultzen du. Parametro ezezagun edo okerrek
400 ematen dute; existitzen ez den fitxak, 404; katalogoaren hutsegiteak, 503.
v1eko erroreen formatua `{ "error": { "code": "...", "message": "..." } }` da.
JSON erantzunek eta OPTIONS aurretiazko eskaerek CORS goiburuak dituzte.

v1eko gaztelaniazko bideek bateragarritasun-alias gisa jarraitzen dute.
`/api/convocatorias` endpoint zaharrak ere aurreko erantzuna mantentzen du.

Swagger `swagger-ui-dist` paketearen tokiko baliabideekin zerbitzatzen da,
CDNrik edo kanpoko baliozkotze-zerbitzurik gabe. `npm run dev` eta `npm run build`
aginduek baliabideak automatikoki prestatzen dituzte. OpenAPI zehaztapena
Zod eskema partekatuetatik sortzen da eta probetan Swagger Parser bidez
egiaztatzen da.

`INTERNAL_API_ORIGIN` aldagaiak zerbitzariak fitxak kontsultatzeko erabiltzen
duen HTTP helbidea ezar dezake; lehenetsia `http://127.0.0.1:${PORT:-3000}` da.
Ez da bisitariaren Host goiburutik eraikitzen. Docker eta Podman bidezko
hedapenean balio lehenetsiak funtzionatzen du. Internetetik eskuragarri izateko,
argitaratu hedapena domeinu batekin eta HTTPS bidez.

Frontend-a profil, iragazki, fitxa eta erlaitzetarako osagaietan antolatuta dago.
APIa irakurtzeko hook-ek erantzunak baliozkotzen dituzte eta eskaerak bertan
behera uztea eta berriz saiatzea kudeatzen dute. Datuak ezabatzeko baieztapenak
jatorrizko HTML elkarrizketa-koadroa erabiltzen du: hasierako fokua «Utzi» aukeran
dago, eta Escape teklak ixten du. Erlaitzetan geziak, Hasiera eta Amaiera teklak
erabil daitezke.
