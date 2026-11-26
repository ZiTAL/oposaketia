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

Aurrean proxy alderantzizko bat badago, ez ezarri `Content-Security-Policy`
goiburua: aplikazioak berak sortzen du nonce bat eskaera bakoitzeko, eta proxyak
goiburua gainidatziko balu nabigatzaileak scriptak blokeatuko lituzke.
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

- `SCRAPE_SOURCES`: komaz bereizitako konektore-IDak. Hutsik edo definitu gabe, erregistroko konektore guztiak erabiltzen dira; zerrenda osoa `scripts/sources.ts` fitxategian dago.
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
bilaketa, nabigatzaileko hobespenak, berriz saiatzea, teklatua eta mugikorreko
irisgarritasuna egiaztatzen dituzte. `tests/browser/` direktorioan aurreko
fluxuetarako proba-multzoak ere badaude.

## Probintziak eta iragazkiak

Webguneak ez du ikasketen profilik eskatzen eta ez du titulazioaren araberako
bat-etortzerik kalkulatzen. Erabiltzaileak deialdia bilatu eta fitxan jasotako
titulazio-baldintza jatorrizko oinarri ofizialetan egiaztatzen du.

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
du. Nabigatzaileko hobespen zaharrak migratzen dira: gogokoak eta iragazkiak
mantentzen dira, eta gordetako ikasketak eta hizkuntza-mailak kentzen dira.

## Interfazearen hizkuntzak

Webgunea euskaraz (`/eu`), gaztelaniaz (`/es`) eta frantsesez (`/fr`) dago.
Gordetako lehentasunik gabeko bisitetan euskara da hizkuntza lehenetsia, baita
hizkuntza-aurrizkirik gabeko erroan ere. EU / ES / FR hautatzailea goiburuan dago,
mugikorrean ere bai, eta uneko orria mantentzen du hizkuntza aldatzean.

Lehentasuna `oposaketia:locale:v1` gakoan gordetzen da, cookie-rik edo konturik
gabe eta profila aldatu gabe. Nabigatzaileak aukera ematen duenean, gordetako
hizkuntza berreskuratzen da; hizkuntza esplizitua duen URLak lehentasuna du.

Interfazea, iragazkien etiketak, mezuak, datak eta metadatuak
itzultzen dira. Probintzien, egoeren eta kategorien identifikatzaileak
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
handler-ek soilik atzitzen dute PostgreSQL. Webguneko gogokoak eta bilaketak ez dira iragazteko APIra bidaltzen.

| Baliabidea | Helbidea edo eginkizuna |
| --- | --- |
| Swagger interaktiboa | <http://localhost:8080/api/docs> |
| OpenAPI 3.1 zehaztapena | <http://localhost:8080/api/v1/openapi.json> |
| `GET /api/v1/calls` | Deialdien zerrenda orrialdekatua. Tamaina murrizteko, dokumentu, baldintza eta gaien array-ak hutsik datoz. |
| `GET /api/v1/calls/{id}` | Fitxa osoa eta eskuragarri dauden dokumentuak eta gai-zerrenda. |
| `GET /api/v1/sources` | Iturriak, estaldura eta eguneratze-txosten publikoak. |
| `GET /api/v1/options` | APIko iragazkietan erabil daitezkeen balioak. |
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

Frontend-a iragazki, fitxa eta erlaitzetarako osagaietan antolatuta dago.
APIa irakurtzeko hook-ek erantzunak baliozkotzen dituzte eta eskaerak bertan
behera uztea eta berriz saiatzea kudeatzen dute. Datuak ezabatzeko baieztapenak
jatorrizko HTML elkarrizketa-koadroa erabiltzen du: hasierako fokua «Utzi» aukeran
dago, eta Escape teklak ixten du. Erlaitzetan geziak, Hasiera eta Amaiera teklak
erabil daitezke.

## Sektore publikoaren inbentarioa

Erakunde berrien integrazioaren jarraipena [docs/inventory/README.md](docs/inventory/README.md)
fitxategian dago. CAPB, CPEN, Tracasa, EJIE, Bizkaiko eta Gipuzkoako aldundiak,
Euskadiko Administrazio Orokorra, Emploi territorial eta Centre Hospitalier de la
Côte Basque gehitu dira. Iturri bakoitzaren mugak konektore-erregistroan eta
inbentarioaren jarraipenean dokumentatzen dira.

Ondoren IFAS, Uliazpi, Lantik, Kabia, Alokabide, Musikene eta Biogipuzkoa
gehitu dira, baita Andoain, Hernani, Zizurkil, Elgoibar, Hondarribia, Ibarra eta
Orioko udal-zerrendak ere. Emploi territorial-en orrialde guztiak irakurtzen
dira. Udal-direktorioetan 682 udal/commune egiaztatu dira, eta Euskadiko,
Nafarroako eta Iparraldeko 570 web-erreferentziaren prospekzioak 112tan
enplegu-esteka hautagaiak
aurkitu ditu. Esteka horiek ez dira berez deialdi edo integrazio oso gisa hartzen.

Open Data Euskadi/IVAPeko iturriak Nafarroako kokapen esplizitua duten fitxak ere
jasotzen ditu; lehen kanpoan gelditzen ziren. Hedapenean 164 fitxa gehitu dira,
horietatik bost NUPekoak eta 34 dokumentu-estekekin. Metadatu territorialak
kontraesankorrak badira, ez da fitxa lurralde okerrean inportatzen.

Choisir le service public ataritik Iparraldeko 52 eskaintza gehitu dira;
kokapena lanpostuaren helbidetik egiaztatzen da. Iparraldeko 156 communeen
probintzia historikoa Euskal Kultur Erakundearen sailkapenarekin osatu da.
Miguel Servet Fundazioa–Navarrabiomed, Gizain eta Itelazpi ere konektatu dira,
argitaratutako oinarriak, titulazioak eta epeak erabiliz.

Parlamento de Navarra, Baluarte eta Miguel Induráin fundazioen iturriak ere
egiaztatuta daude. Gipuzkoako beste 13 udalen egoitzak lotu dira (44 fitxa);
Aramaren enplegu-modulua hutsik dago egiaztapen honetan. Erakunde bakoitzaren
estaldura eta mugak [inbentarioan](docs/inventory/README.md) daude.

Leioa, Berrioplano, Orkoien eta Mañeruko udal-iturriak gehitu dira, baita
Osatekeko lanpostuen atala eta La Sécu recrute-ko Iparraldeko eskaintzak ere.
Eskaneatutako bandoen berrikuspenak dokumentuaren URL eta SHA-256rekin
lotzen dira; epe ezezagunak ez dira asmatzen.

Arkaute, Baztan eta Estella-Lizarrako iturriak ere gehitu dira. Arkauteko
plazen handitze-ebazpenak irakurtzen dira: 2025eko Ertzaintzako deialdia
327 plazara handitu zen. Baztango bi prozesuen euskarazko BONeko oinarriak,
C1 baldintza eta 21na gai berreskuratu dira. Estella-Lizarrako 12 prozesuetatik
seitan gai-zerrenda irakurri da; falta diren oinarriak esplizituki markatzen dira.

Cámara de Comptos eta SCPSA / Iruñerriko Mankomunitatearen enplegu-iturriak ere
gehitu dira: 2 eta 12 prozesu, hurrenez hurren. Webeko erakusketa-data ez da
inskripzio-epearekin nahasten. Nafarroako direktorio ofizialek eta gordetako
REELL snapshotak erakundeen 99 web-erreferentzia kontrastatzeko aukera eman
dute; kanal bat aurkitzeak ez du estaldura osoa edo lanpostu berriak frogatzen.


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

Ablitasko Udalaren gazteria, kultura eta kiroleko teknikariaren 2025eko
oposaketa ere gehitu da (`ablitas`). Udal-iragarkiak 2025-04-23ko epea
eta B gidabaimenari buruzko zuzenketa ematen ditu; oinarrien PDFko II.
eranskinetik 12 gaiak jaso dira. Beste udal-prozesuak berrikusteko daude.

Agoizko Udalaren lorezaintzako zerbitzu anitzetako plaza finkoa ere gehitu
da (`agoitz`). Udal-webgunean argitaratutako oinarrietatik II. eranskineko
11 gaiak eta baldintzak atera dira. Epea BONen argitalpenaren ondoko 30 egun
naturalekoa da; amaiera-data absolutua ez da asmatu.

Artaxoako Udalaren familia-langilearen 2025eko plaza ere gehitu da
(`artajona-familiar`). BONeko jatorrizko oinarrietako 10 gaiak jaso dira,
eta 2. gaia 2025/30/25eko zuzenketa ofizialaren arabera ordezkatu da.
Eskolatze-ziurtagiria ez da DBH titulutzat hartu; epearen azken egun
absolutua ez da asmatu.

Casedako Udalaren administrari ofizialaren 2025eko aldi baterako kontratazio-
zerrenda ere gehitu da (`caseda`). Udal-iragarkitik eta oinarri PDFtik
2025-11-05eko epea eta Batxilergoaren edo FPIIren baldintza egiaztatzen dira.
Merezimenduen balorazioa da; ez dago oposaketako gai-zerrendarik edo
argitaratutako plaza-kopuru zehatzik.

Caparrosoko Udalaren 2026/236/18 BONeko zerbitzu anitzetako plaza
(`bon-local`) osatu da: txanda irekiko plaza bakarra, E maila,
eskolatze-ziurtagiria, B gidabaimena eta II. eranskineko 11 gaiak.
2026-11-26ko argitalpenaren ondoko 20 egun naturaleko epea
2026-12-16an amaitzen dela kalkulatu da; lehendik zegoen fitxa
eguneratu da, bikoizturik sortu gabe.

Aiegiko Udalaren 2023ko zerbitzu anitzetako funtzionario-plaza ere
gehitu da (`ayegui`). Udaleko enplegu-atariak BON 2023/33/36ko
oinarrietara lotzen du; II. eranskineko 11 gaiak, DBH edo erdi-mailako
FP egiaztatzen dira; 15 egun naturaleko epearen itxiera 2023-03-03an
kalkulatzen da. B+E gidabaimena lanpostua hartu ondorengo sei
hilabeteetan lortu behar zen.

Etxarri Aranazko Udalaren 2026ko administrari laguntzailearen aldi
baterako kontratazio-poltsa ere gehitu da (`etxarri-aux`). Udaleko
iragarkitik eta oinarri elebidunetatik 2026-10-22ko epea, DBH edo
erdi-mailako FP eta euskara C1 egiaztatzen dira. Ofimatika-proba
praktikoa dago, baina ez gai-zerrenda zenbakiturik.

Ezkabarteko Udalaren 2025eko zerbitzu anitzetako hiru funtzionario-
plazak ere gehitu dira (`ezcabarte-2025`). BON 2025/149/12ko II.
eranskineko 13 gaiak eta BON 2025/166/9ko egutegi-zuzenketa jaso dira.
DBH edo lehen mailako FP eta B gidabaimena egiaztatzen dira; azken
egun arrunta igandea zenez, eskaera-epea 2025-08-18ra luzatu zen.

Iturmendiko Udalaren 2025eko zerbitzu anitzetako funtzionario-plaza
ere gehitu da (`iturmendi-2025`). BON 2025/132/12ko II. eranskineko
14 gaiak, DBH edo lehen mailako FP, euskara B2 eta B gidabaimena
egiaztatzen dira. Eskaera-epea 30 egun naturalekoa zen; amaiera-data
absolutua ez da asmatu.

Izabako Udalaren 2026ko zerbitzu anitzetako sei hilabeteko errefortzu-
plaza ere gehitu da (`isaba`). Udal-iragarkian lotutako oinarri PDFtik
lehen mailako ikasketen ziurtagiria, B gidabaimena eta 2026-04-20ko
epea egiaztatzen dira. Euskara meritua da, eta ez dago gai-zerrenda
zenbakiturik.

Larragako Udalaren 2026ko administrariaren sei hilabeteko aldi
baterako plaza ere gehitu da (`larraga-admin`). Udal-iragarkian lotutako
oinarri PDFtik Batxilergoa edo FPII, enplegu-eskatzailearen baldintza
eta 2026-03-06ko epea egiaztatzen dira. Proba praktikoa dago, baina
ez gai-zerrenda zenbakiturik.
