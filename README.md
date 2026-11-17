# Oposaketia

Buscador de empleo público de Euskadi, Navarra y el País Vasco francés, sin cuentas.
El perfil, los estudios, los idiomas, las búsquedas y los favoritos se guardan
únicamente en `localStorage`. El catálogo común se almacena en PostgreSQL.

Next.js, React, TypeScript, Tailwind CSS, PostgreSQL y Nginx. El despliegue está
preparado para Docker Compose y Podman.

## Arrancar con Docker o Podman

Desde la raíz del proyecto:

```sh
cp docker/.env.example docker/.env
```

Configura una contraseña alfanumérica aleatoria en `POSTGRES_PASSWORD`. El entorno
local preparado ya tiene una contraseña generada e ignorada por Git. No cambies
esa contraseña después de crear el volumen sin actualizar también el usuario de
PostgreSQL. El puerto por defecto es `8080`.

```sh
docker compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" up -d --build
```

Con Podman y `podman-compose`:

```sh
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" up -d --build
```

Acceso: http://localhost:8080. Salud: `/health`. Fuentes y cobertura: `/fuentes`.
Usamos rutas absolutas para evitar problemas de directorio en algunos proveedores
Compose. Para detener, sustituye `up -d --build` por `down`. `down` conserva los
volúmenes; `down -v` los elimina.

Servicios:

- `web`: Nginx; único puerto publicado.
- `app`: Next.js standalone, sin privilegios. Su salud requiere acceso al catálogo.
- `db`: PostgreSQL 17, sin puerto publicado, con volumen persistente.
- `init`: crea la tabla e importa ejemplos solo con `DEMO_MODE=true`.
- `scraper`: consulta las fuentes oficiales al arrancar y cada seis horas después
  de terminar la ejecución anterior. Guarda directamente en PostgreSQL.
- `updater`: importador opcional de JSON, perfil Compose `import`.

`init`, `scraper` y `updater` comparten la imagen `oposaketia-importer:local`.
Los PDF se procesan con `pdftotext` (Poppler), incluido en esa imagen. La primera
recogida puede tardar varios minutos; los fallos de una fuente no borran las demás.

```sh
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" logs -f scraper
```

## Fuentes conectadas y límites

| Fuente | Cobertura del conector |
| --- | --- |
| Open Data Euskadi / IVAP | Catálogo `empleo_publico_otras_ope`, filtrado geográficamente a Euskadi y a plazos de los últimos 90 días o futuros; para ayuntamientos amplía la ventana a 12 meses, incluidos Bilbao, Getxo y Barakaldo. El portal OPE de Bilbao prohíbe scraping directo, por lo que sus fichas proceden del catálogo oficial de Euskadi. Sigue la ficha vigente y sus enlaces de bases y temarios. No cubre todos los procesos de cada organismo. |
| Lanbide | Sección Empleo público, paginada y filtrada a Euskadi y Navarra. Mantiene el organismo convocante; los requisitos, plazos y temarios ausentes quedan pendientes de comprobar. |
| Vitoria-Gasteiz | Puestos de la OPE 22-24, bases específicas y materiales de preparación por puesto. No incluye convocatorias internas. |
| Euskotren | Puestos del portal público de empleo, requisitos y enlaces a bases y materiales. Plazos y estado pendientes de confirmación; no extrae temarios específicos. |
| EITB | Convocatorias públicas y pruebas para bolsas en los procesos abiertos; conserva los enlaces oficiales a requisitos y temarios. |
| Portal de Empleo Público de Álava | Anuncios recientes de la Diputación, sector público foral y entidades locales de Álava. Algunas entidades locales pueden no haber notificado sus procesos. |
| Ayuntamiento de Donostia / San Sebastián | Convocatorias que aparecen en la sección municipal «En plazo», con requisitos y documentos enlazados. |
| EHU | OPE de personal técnico, de gestión y de administración y servicios. Las fichas enlazan requisitos, bases específicas y documentación de cada escala. |
| IVAP | Primera página del buscador de ofertas difundidas por el IVAP, incluidas ofertas locales. Extrae fichas, plazas, plazos, requisitos y documentos disponibles. No recorre otras páginas porque `robots.txt` excluye la paginación. |
| Osakidetza | Categorías del portal público de selección de la OPE 2023-2024-2025. La lista requiere interacción para abrir cada categoría; se enlazan las bases generales y la bibliografía común, y el detalle se consulta en Osakidetza. |
| Gobierno de Navarra / BON | Recorre toda la paginación del buscador oficial y sigue las fichas en plazo o en resolución. Extrae requisitos y enlaces normativos; reconoce anexos de temario del BON. Excluye trámites finalizados del descubrimiento. |
| CDG 64 | Descubre el calendario regional más reciente y extrae los concursos con vía externa que reconoce en sus tablas. Añade guías generales cuando puede asociarlas por título. Es planificación regional de Nouvelle-Aquitaine, no una confirmación de vacantes o destinos en Iparralde. |

Referencias oficiales:

- https://opendata.euskadi.eus/catalogo/-/oferta-publica-de-empleo-ope-de-otras-administraciones-publicas-vascas/
- https://www.eitbtaldea.eus/es/convocatoria-publica.php
- https://enplegupublikoa.araba.eus/es/administracion-local
- https://www.donostia.eus/es/desarrollo-economico-empleo/ofertas-empleo-municipales
- https://www.ehu.eus/es/web/azp/epe-2023_24
- https://www.ivap.euskadi.eus/empleo-ivap/
- https://www.osakidetza.euskadi.eus/ope-2023-2024-2025/webosk00-procon/es/
- https://www.navarra.es/es/empleo-publico/convocatorias
- https://www.cdg-64.fr/concours-et-examens/calendriers-et-brochures-dinformations/calendriers-et-informations-generales/

**La cobertura todavía es parcial.** No se presenta el calendario francés como una
convocatoria abierta, ni se presupone que los concursos regionales tengan plazas
en el País Vasco francés. Las guías generales no se presentan como temarios de
una sesión concreta. No está integrado el conjunto de administraciones locales,
organismos sanitarios, educativos y empleo estatal de los tres territorios.

## Qué hace el scraping

- Usa únicamente fuentes oficiales incluidas en una lista explícita de dominios.
- Consulta `robots.txt`, limita la frecuencia, acota tamaños, tiempos y
  redirecciones, y reintenta fallos transitorios. No utiliza navegador ni inicia
  sesión. No sigue enlaces a listas de aspirantes o resultados nominativos.
- Guarda las respuestas en caché y usa ETag/Last-Modified cuando la fuente los
  proporciona. Respeta la codificación de cada página, incluidos documentos Latin-1.
- Prioriza el título de la ficha vigente frente al del catálogo si han cambiado.
- Conserva la URL oficial, fecha de consulta, huella de contenido y documentos.
  `scrapedAt` indica consulta automática; `verifiedAt` se reserva a revisión humana.
- Solo asigna titulaciones cuando reconoce expresiones explícitas. Un puesto o un
  grupo no basta para inferirlas. No traduce automáticamente PL1–PL4 a niveles
  europeos ni infiere equivalencias entre títulos españoles y franceses.
- Diferencia inscripción abierta, proceso en curso, cerrado, fecha pendiente y
  calendario. No confunde fechas de alegaciones con fechas de inscripción ni
  calcula plazos expresados en días hábiles.
- Los temarios enlazan al documento oficial. El BON permite extraer temas cuando
  se reconoce el anexo; los extractos pueden omitir apartados y correcciones.
  Un PDF de bases con varios puestos no se asigna automáticamente a un único
  temario: la extracción de PDF se reserva a enlaces expresamente titulados como
  temario o programa. Los PDF bloqueados quedan enlazados, sin contenido inventado.
- Valida e importa por identificador estable, en una transacción por fuente.
  No elimina fichas ausentes: las fuentes pueden fallar o retirar contenido.
  Las fichas abiertas con plazo vencido se muestran como cerradas. Las fichas
  antiguas y los fallos de actualización se señalan mediante fechas y la página
  de fuentes; revisa siempre el original antes de inscribirte.

Los informes se guardan en la tabla `scrape_sources`. Cada intento registra el
resultado y conserva la fecha del último intento con datos. Una importación
parcial puede contener documentos pendientes o fichas que no se pudieron leer.
Las incidencias detalladas quedan en logs y en `scrape-report.json`, no en el
perfil del visitante.

## Ejecutar una recogida manual

Con Node.js 24, npm y `pdftotext` instalados:

```sh
npm ci
npm run scrape
```

Sin `DATABASE_URL`, exporta `data/imports/catalogue.json` y
`data/imports/scrape-report.json`. Con `DATABASE_URL`, también importa y guarda
el informe directamente. No inicia PostgreSQL por su cuenta.

Opciones:

- `SCRAPE_SOURCES=euskadi,eitb,araba,donostia,ehu,ivap,osakidetza,euskotren,vitoria,lanbide,navarra,cdg64`: selecciona conectores.
- `SCRAPE_INTERVAL_SECONDS=21600`: intervalo del servicio (mínimo 3600).
- `SCRAPE_OUTPUT_DIR=data/imports`: carpeta de exportación.
- `SCRAPE_CACHE_DIR=data/scrape-cache`: caché de respuestas.

En contenedor, con el despliegue arrancado:

```sh
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" run --no-deps --rm -T scraper npm run scrape
```

No lances varias recogidas simultáneas contra la misma carpeta de exportación.
Para aplicar exportaciones ya recogidas, incluido su informe, monta la carpeta:

```sh
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" run --no-deps --rm -T -v "$(pwd)/data/imports:/imports:ro,Z" init node_modules/.bin/tsx scripts/apply-scrape.ts /imports
```

Para JSON revisado manualmente se conserva `npm run db:import -- fichero.json`.
El formato y la validación están en `src/lib/catalogue.ts`; `data/demo.json`
contiene ejemplos. Los datos reales sin consulta trazable ni revisión se rechazan.
El perfil opcional `import` permite importar periódicamente
`data/imports/catalogue.json` con `IMPORT_INTERVAL_SECONDS` (mínimo 60).

## Red con proxy o CA propia

La construcción admite el secreto opcional `npm_ca`, que solo se monta durante
la instalación. Por ejemplo, si tu entorno define `NODE_EXTRA_CA_CERTS`:

```sh
podman build --network host --secret id=npm_ca,src="$NODE_EXTRA_CA_CERTS" -f docker/Dockerfile --target runner -t oposaketia_app .
podman build --network host --secret id=npm_ca,src="$NODE_EXTRA_CA_CERTS" -f docker/Dockerfile --target importer -t oposaketia-importer:local .
```

Para el acceso a fuentes en ejecución usa el override opcional. Recoge
`HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` y monta el certificado en solo lectura:

```sh
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" -f "$(pwd)/docker/docker-compose.proxy.yml" up -d --no-build
```

No se desactiva la verificación TLS. No copies credenciales de proxy ni certificados
privados al repositorio o a la imagen de producción.

## Desarrollo y comprobaciones

```sh
npm ci
cp .env.example .env.local
npm run dev
npm run typecheck
npm test
npm run build
```

Sin base de datos, `.env.example` activa datos demo para desarrollo. En el despliegue
normal, `DEMO_MODE=false` oculta las fichas ilustrativas que pudiera haber en el
volumen. La web mantiene `noindex` hasta que se revise su preparación para publicación.
Para exposición pública, termina TLS en el proxy de despliegue o en otro proxy.

Pruebas de navegador con Chromium ya instalado:

```sh
# Contra el despliegue real:
TEST_CATALOGUE=official CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
# Contra un servidor de desarrollo con datos demo:
TEST_BASE_URL=http://localhost:3000 CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

Si no tienes Chromium, `npx playwright install chromium` instala el de Playwright;
en ese caso omite `CHROMIUM_PATH`. Las pruebas de parsers son deterministas y no
consultan portales. Las pruebas oficiales de navegador comprueban el catálogo
real importado, los enlaces a temarios, los filtros, la paginación, favoritos y móvil.

## Provincias

El buscador permite seleccionar varias provincias a la vez: Araba/Álava, Bizkaia,
Gipuzkoa, Navarra, Lapurdi, Baja Navarra y Zuberoa, además de
«Ámbito general / sin concretar». No hay un filtro
separado de territorios. Se muestran las fichas de cualquiera de las opciones
marcadas; «Todas» (selección vacía) muestra el catálogo completo. La selección se
conserva en el navegador. Los perfiles antiguos conservan sus estudios, favoritos
y provincia seleccionada; los antiguos filtros de territorio dejan de aplicarse.

Los conectores guardan `province` a partir de los nombres o códigos provinciales
explícitos de la fuente. Navarra corresponde a una única provincia. Si los datos
son contradictorios o solo indican ámbito autonómico o regional, se conserva
`province=null` y la ficha aparece en «Ámbito general / sin concretar». El calendario
francés de Nouvelle-Aquitaine sigue en ese grupo: no se le asigna un destino local.

Para completar ese campo en una base que ya tenía fichas importadas, con el
scraper detenido para evitar una actualización simultánea:

```sh
podman-compose --env-file "$(pwd)/docker/.env" -f "$(pwd)/docker/docker-compose.yml" run --no-deps --rm -T scraper node_modules/.bin/tsx scripts/backfill-provinces.ts
```

En una red con proxy, añade también `-f "$(pwd)/docker/docker-compose.proxy.yml"`.
El comando consulta el catálogo oficial y solo actualiza el campo de provincia;
conserva identificadores, temarios y fechas de consulta.

Los estados también permiten selección múltiple: Abierta, Próximamente, En curso,
Cerrada, Calendario y Pendiente de confirmar. Se muestran las fichas de cualquiera
de los estados marcados, combinadas con las provincias elegidas. «Todos»
(selección vacía) elimina únicamente el filtro de estados. La selección se guarda
en el navegador y los perfiles con un único estado se migran al nuevo formato.

Las tres provincias históricas de Iparralde se pueden seleccionar simultáneamente
y combinar con las demás. El calendario regional de Nouvelle-Aquitaine conserva
`province=null`; no se asigna a Lapurdi, Baja Navarra o Zuberoa sin una ubicación
confirmada. Si no hay fichas clasificadas en las provincias de Iparralde elegidas,
la interfaz lo explica y permite incluir el ámbito general conservando las otras
selecciones.

Las categorías usan el mismo selector múltiple: Administración, Sanidad, Educación
y Servicios. Los resultados pertenecen a cualquiera de las categorías marcadas
y cumplen también los filtros de provincias y estados. «Todas» elimina solo el
filtro de categorías. La preferencia guardada anteriormente como una sola
categoría se recupera sin perder estudios, favoritos ni otras selecciones.

## Idiomas de la interfaz

La web está disponible en euskera (`/eu`), castellano (`/es`) y francés (`/fr`).
El euskera es el idioma predeterminado para visitas sin una preferencia guardada.
El selector EU / ES / FR aparece en la cabecera también en móvil y conserva la
página actual al cambiar. La preferencia se guarda por separado en
`oposaketia:locale:v1`, sin cookies, sin cuentas y sin modificar el perfil.
La raíz sin prefijo mantiene castellano por defecto y recupera una preferencia
previamente guardada cuando el navegador permite almacenamiento local; una URL
con idioma explícito tiene prioridad.

La interfaz, las etiquetas de filtros y titulaciones, los mensajes, las fechas y
los metadatos se traducen. Los identificadores de estudios, provincias, estados y
categorías se conservan, por lo que cambiar de idioma mantiene filtros y favoritos.
Los títulos, requisitos, documentos y temas oficiales permanecen en el idioma de
la fuente; la ficha lo indica cuando ese idioma difiere del de la interfaz.
Las traducciones se mantienen en `src/lib/i18n/messages.ts`. Las rutas localizadas
se resuelven con `src/proxy.ts`, que establece el idioma para el HTML del servidor.
La API de catálogo conserva sus valores estables y no usa prefijos de idioma.

Las pruebas de `tests/browser/languages.spec.ts` comprueban las tres versiones,
el HTML del servidor, la navegación, los favoritos y filtros entre idiomas, la
recuperación de la preferencia, las páginas no encontradas y el uso sin localStorage.

## API pública y Swagger

La API de lectura está en `/api/v1`, sin cuentas ni API keys y con CORS
`Access-Control-Allow-Origin: *`. La web consume esta API: catálogo y fuentes
mediante `fetch` en el navegador; el detalle y sus metadatos mediante HTTP desde
el servidor. Solo los handlers de la API acceden a PostgreSQL. Los estudios,
idiomas, favoritos y búsquedas siguen en `localStorage`; la web no los envía a
la API para filtrar.

- Swagger interactivo: <http://localhost:8080/api/docs>
- Especificación OpenAPI 3.1: <http://localhost:8080/api/v1/openapi.json>
- `GET /api/v1/calls`: listado paginado, con arrays de documentos,
  requisitos y temas vacíos para reducir el tamaño.
- `GET /api/v1/calls/{id}`: ficha completa y documentos/temario disponibles.
- `GET /api/v1/sources`: fuentes, cobertura e informes públicos de actualización.
- `GET /api/v1/options`: valores de filtros y titulaciones.
- `GET /api/v1/health`: estado del servicio.

El listado admite `q`, `page` (desde 1), `limit` (1–200, por defecto 20) y
`sort=title|deadline|province|status`. Repite `province`, `category`, `status`,
`territory`, `source` o `qualification` para seleccionar varios valores. Los
valores son los que devuelve `/options`, independientemente del idioma de la
interfaz. Dentro de un filtro se aplica OR y entre filtros AND. Para fichas sin
provincia confirmada usa `province=Sin concretar`.

```sh
curl --get 'http://localhost:8080/api/v1/calls' \
  --data-urlencode 'province=Bizkaia' \
  --data-urlencode 'province=Gipuzkoa' \
  --data-urlencode 'status=Abierta' \
  --data-urlencode 'limit=20'
```

La respuesta incluye `calls` y `pagination: { page, limit, total, pages }`.
Una página fuera de rango devuelve un array vacío. Parámetros desconocidos o
inválidos devuelven 400, una ficha inexistente 404 y un fallo del catálogo 503.
Los errores de v1 tienen la forma `{ "error": { "code": "...", "message": "..." } }`.
Las respuestas JSON y los preflight OPTIONS incluyen CORS. El endpoint antiguo
`/api/convocatorias` conserva su respuesta para clientes existentes.

Swagger se sirve con recursos locales de `swagger-ui-dist`, sin CDN ni servicio
externo de validación. `npm run dev` y `npm run build` preparan sus recursos
automáticamente. La especificación se genera desde los esquemas Zod compartidos
con la validación de respuestas y se comprueba con Swagger Parser en las pruebas.

`INTERNAL_API_ORIGIN` puede configurar la dirección HTTP usada por el servidor
para consultar las fichas (por defecto `http://127.0.0.1:${PORT:-3000}`). No se
construye desde la cabecera Host del visitante. En Docker/Podman funciona con
el valor por defecto. Para hacer accesible esta API desde Internet hay que
publicar el despliegue con un dominio y HTTPS; la instalación local sigue en
`localhost:8080`.

El frontend se organiza en componentes de perfil, filtros, pestañas y fichas,
con hooks de lectura de la API, validación de respuestas, cancelación y reintento.
La confirmación de borrado usa un diálogo nativo con foco en Cancelar y cierre
con Escape; las pestañas admiten flechas, Inicio y Fin.

La documentación Swagger, los endpoints canónicos y los errores de la API están en inglés. Las rutas españolas de v1 siguen como aliases de compatibilidad. Los textos oficiales y los valores de filtros conservan su idioma original para mantener estables los identificadores.
