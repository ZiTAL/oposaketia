import {test,expect}from'@playwright/test';
test.skip(process.env.TEST_CATALOGUE!=='official','Estas pruebas requieren el catálogo oficial importado.');
test('official catalogue has source provenance and paginates without losing favorites',async({page,request})=>{
 const response=await request.get('/api/convocatorias');expect(response.ok()).toBe(true);const {calls}=await response.json();
 expect(calls.length).toBeGreaterThan(0);expect(calls.every((c:{isDemo:boolean;sourceId:string;scrapedAt:string})=>!c.isDemo&&c.sourceId&&c.scrapedAt)).toBe(true);
 await page.goto('/es');await expect(page.getByText('Catálogo de fuentes oficiales',{exact:false})).toBeVisible();
 await expect(page.getByText('TUS ESTUDIOS',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Solo coincidencias con mis estudios e idiomas')).toHaveCount(0);
 await expect(page.locator('.opposition-card')).toHaveCount(Math.min(20,calls.length));
 if(calls.length>20){await page.getByRole('button',{name:'Siguiente →'}).click();await expect(page.locator('.pagination')).toContainText('Página 2');}
 const first=page.locator('.opposition-card').first();const title=await first.getByRole('heading').innerText();
 await first.locator('.bookmark-button').click();await page.reload();await page.getByRole('tab',{name:/Guardadas/}).click();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
});
test('a real syllabus and its source are visible on the individual call page',async({page,request})=>{
 const {calls}=await(await request.get('/api/convocatorias')).json();const call=calls.find((c:{syllabusUrl:string|null})=>c.syllabusUrl);
 expect(call).toBeTruthy();await page.goto('/es/oposiciones/'+call.id);
 await expect(page.getByRole('heading',{name:call.title,exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Temario extraído de las bases'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Temario oficial',exact:true})).toHaveAttribute('href',call.syllabusUrl);
 await expect(page.getByText('Fuente consultada:',{exact:false})).toBeVisible();
});
test('source coverage, open-entry filter and mobile layout are usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/es');
 await page.getByRole('checkbox',{name:'Abierta',exact:true}).check();
 const badges=await page.locator('.opposition-card .status-tag').allTextContents();expect(badges.every(text=>text==='Abierta')).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('link',{name:'Ver fuentes y actualización ↗'}).click();
 await expect(page.getByRole('heading',{name:'Fuentes y cobertura',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Gobierno de Navarra / BON'})).toBeVisible();
 await expect(page.getByText('No confirma destinos en Iparralde',{exact:false})).toBeVisible();
});
test('multiple provinces filter actual calls and persist without a territory control',async({page,request})=>{
 const {calls}=await(await request.get('/api/convocatorias')).json();
 const expected=calls.filter((call:{province:string|null})=>['Bizkaia','Gipuzkoa'].includes(call.province??''));expect(expected.length).toBeGreaterThan(0);
 await page.goto('/es');await expect(page.getByRole('combobox',{name:'Territorio',exact:true})).toHaveCount(0);
 await page.getByRole('checkbox',{name:'Bizkaia',exact:true}).check();
 await page.getByRole('checkbox',{name:'Gipuzkoa',exact:true}).check();
 await expect(page.locator('.result-count strong')).toHaveText(String(expected.length));
 expect((await page.locator('.province-label').allTextContents()).every(label=>['Bizkaia','Gipuzkoa'].includes(label))).toBe(true);
 await page.reload();await expect(page.getByRole('checkbox',{name:'Bizkaia',exact:true})).toBeChecked();await expect(page.getByRole('checkbox',{name:'Gipuzkoa',exact:true})).toBeChecked();
 await page.getByRole('checkbox',{name:'Bizkaia',exact:true}).uncheck();
 await expect(page.locator('.result-count strong')).toHaveText(String(calls.filter((c:{province:string|null})=>c.province==='Gipuzkoa').length));
 await page.getByRole('link',{name:'Ver ficha',exact:true}).first().click();await expect(page.getByText('Provincia: Gipuzkoa',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Volver al buscador'}).click();await page.getByRole('group',{name:'Provincias',exact:true}).getByRole('button',{name:'Todas',exact:true}).click();
 await expect(page.locator('.result-count strong')).toHaveText(String(calls.length));
 await page.getByRole('checkbox',{name:'Ámbito general / sin concretar',exact:true}).check();
 expect((await page.locator('.province-label').allTextContents()).every(label=>label.includes('sin concretar'))).toBe(true);
});
test('old browser profiles migrate without losing favorites or keeping a hidden territory',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('oposaketia:profile:v1',JSON.stringify({qualifications:['bachiller'],euskera:'B2',francés:'Sin acreditar',province:'Bizkaia',territory:'Euskadi',search:'',category:'Todas',favorites:['saved-before-upgrade'],recent:['administrativo'],onlyMatches:false,status:'Todos'})));
 await page.setViewportSize({width:390,height:844});await page.goto('/es');
 await expect(page.getByRole('checkbox',{name:'Bizkaia',exact:true})).toBeChecked();
 await page.getByRole('checkbox',{name:'Navarra',exact:true}).check();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('oposaketia:profile:v1')!));expect(stored).toMatchObject({provinces:['Bizkaia','Navarra'],favorites:['saved-before-upgrade']});expect(stored).not.toHaveProperty('qualifications');expect(stored).not.toHaveProperty('onlyMatches');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('multiple states combine, persist, reset and work with provinces on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/es');
 await expect(page.getByRole('combobox',{name:'Estado de inscripción'})).toHaveCount(0);
 await page.getByRole('checkbox',{name:'Abierta',exact:true}).check();
 await page.getByRole('checkbox',{name:'Cerrada',exact:true}).check();
 await page.getByRole('checkbox',{name:'Próximamente',exact:true}).check();
 await expect(page.locator('.opposition-card').first()).toBeVisible();
 expect((await page.locator('.status-tag').allTextContents()).every(status=>['Abierta','Cerrada','Próximamente'].includes(status))).toBe(true);
 await page.reload();for(const name of ['Abierta','Cerrada','Próximamente'])await expect(page.getByRole('checkbox',{name,exact:true})).toBeChecked();
 await page.getByRole('checkbox',{name:'Bizkaia',exact:true}).check();
 expect((await page.locator('.province-label').allTextContents()).every(province=>province==='Bizkaia')).toBe(true);
 await page.getByRole('button',{name:'Todos',exact:true}).click();
 for(const name of ['Abierta','Cerrada','Próximamente'])await expect(page.getByRole('checkbox',{name,exact:true})).not.toBeChecked();
 await expect(page.getByRole('checkbox',{name:'Bizkaia',exact:true})).toBeChecked();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('the former single-state preference migrates alongside existing province selections',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('oposaketia:profile:v1',JSON.stringify({qualifications:[],euskera:'Sin acreditar',francés:'Sin acreditar',provinces:['Bizkaia','Gipuzkoa'],search:'',category:'Todas',favorites:['saved-before-states'],recent:[],onlyMatches:false,status:'Abierta'})));
 await page.goto('/es');await expect(page.getByRole('checkbox',{name:'Abierta',exact:true})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:'Bizkaia',exact:true})).toBeChecked();await expect(page.getByRole('checkbox',{name:'Gipuzkoa',exact:true})).toBeChecked();
 await page.getByRole('checkbox',{name:'Próximamente',exact:true}).check();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('oposaketia:profile:v1')!));
 expect(stored).toMatchObject({statuses:['Abierta','Próximamente'],provinces:['Bizkaia','Gipuzkoa'],favorites:['saved-before-states']});expect(stored).not.toHaveProperty('status');
});
test('Iparralde provinces are selectable together and persist on mobile',async({page,request})=>{
 const {calls}=await(await request.get('/api/convocatorias')).json();
 const hasLocal=calls.some((call:{province:string|null})=>['Lapurdi','Baja Navarra','Zuberoa'].includes(call.province??''));
 await page.setViewportSize({width:390,height:844});await page.goto('/es');
 for(const name of ['Lapurdi','Baja Navarra','Zuberoa'])await page.getByRole('checkbox',{name,exact:true}).check();
 await page.reload();for(const name of ['Lapurdi','Baja Navarra','Zuberoa'])await expect(page.getByRole('checkbox',{name,exact:true})).toBeChecked();
 if(!hasLocal){
  await expect(page.locator('.iparralde-note')).toContainText('Todavía no hay fichas con provincia confirmada');
  await page.getByRole('button',{name:'Incluir ámbito general',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'Ámbito general / sin concretar',exact:true})).toBeChecked();
  expect((await page.locator('.province-label').allTextContents()).every(label=>label.includes('sin concretar'))).toBe(true);
 }
 await expect(page.locator('.opposition-card').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('multiple categories combine with provinces, persist, and reset independently',async({page,request})=>{
 const {calls}=await(await request.get('/api/convocatorias')).json();
 const expected=calls.filter((call:{category:string})=>['Administración','Sanidad'].includes(call.category));
 await page.setViewportSize({width:390,height:844});await page.goto('/es');
 await expect(page.getByRole('combobox',{name:'Categoría',exact:true})).toHaveCount(0);
 await page.getByRole('checkbox',{name:'Administración',exact:true}).check();
 await page.getByRole('checkbox',{name:'Sanidad',exact:true}).check();
 await expect(page.locator('.result-count strong')).toHaveText(String(expected.length));
 await page.reload();for(const name of ['Administración','Sanidad'])await expect(page.getByRole('checkbox',{name,exact:true})).toBeChecked();
 await page.getByRole('checkbox',{name:'Bizkaia',exact:true}).check();
 await expect(page.locator('.result-count strong')).toHaveText(String(expected.filter((call:{province:string|null})=>call.province==='Bizkaia').length));
 await page.getByRole('group',{name:'Categorías',exact:true}).getByRole('button',{name:'Todas',exact:true}).click();
 for(const name of ['Administración','Sanidad'])await expect(page.getByRole('checkbox',{name,exact:true})).not.toBeChecked();
 await expect(page.getByRole('checkbox',{name:'Bizkaia',exact:true})).toBeChecked();
 await expect(page.locator('.result-count strong')).toHaveText(String(calls.filter((call:{province:string|null})=>call.province==='Bizkaia').length));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('a saved single category migrates alongside multi-select provinces and states',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('oposaketia:profile:v1',JSON.stringify({qualifications:[],euskera:'Sin acreditar',francés:'Sin acreditar',provinces:['Bizkaia'],statuses:['Abierta','Cerrada'],search:'',category:'Administración',favorites:['saved-before-categories'],recent:[],onlyMatches:false})));
 await page.goto('/es');await expect(page.getByRole('checkbox',{name:'Administración',exact:true})).toBeChecked();
 await page.getByRole('checkbox',{name:'Sanidad',exact:true}).check();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('oposaketia:profile:v1')!));
 expect(stored).toMatchObject({categories:['Administración','Sanidad'],provinces:['Bizkaia'],statuses:['Abierta','Cerrada'],favorites:['saved-before-categories']});expect(stored).not.toHaveProperty('category');
});
