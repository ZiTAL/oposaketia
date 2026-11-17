import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('public API supports CORS, filters, pagination, complete detail and OpenAPI',async({request})=>{
 const list=await request.get('/api/v1/calls?limit=2');expect(list.status()).toBe(200);expect(list.headers()['access-control-allow-origin']).toBe('*');const body=await list.json();expect(body.calls.length).toBeLessThanOrEqual(2);expect(body.pagination.limit).toBe(2);
 const bad=await request.get('/api/v1/calls?limit=999');expect(bad.status()).toBe(400);expect((await bad.json()).error.code).toBe('INVALID_QUERY');
 const detail=await request.get('/api/v1/calls/'+body.calls[0].id);expect(detail.status()).toBe(200);expect((await detail.json()).call.id).toBe(body.calls[0].id);
 expect((await request.get('/api/v1/calls/does-not-exist')).status()).toBe(404);
 const preflight=await request.fetch('/api/v1/sources',{method:'OPTIONS',headers:{Origin:'https://another-app.example','Access-Control-Request-Method':'GET'}});expect(preflight.status()).toBe(204);expect(preflight.headers()['access-control-allow-origin']).toBe('*');
 expect((await(await request.get('/api/v1/openapi.json')).json()).openapi).toBe('3.1.0');
});
test('browser loads catalogue through v1 and keeps profile selections out of API requests',async({page})=>{
 const queries:string[]=[];page.on('request',request=>{if(request.url().includes('/api/v1/'))queries.push(request.url());});
 await page.goto('/es');await expect(page.locator('.opposition-card').first()).toBeVisible();expect(queries.some(url=>url.includes('/api/v1/calls?limit=200'))).toBe(true);
 await page.getByRole('checkbox',{name:'Grado / Diplomatura universitaria',exact:true}).check();await page.getByRole('checkbox',{name:'Medicina',exact:true}).check();await page.getByRole('checkbox',{name:'Bizkaia',exact:true}).check();await page.getByRole('checkbox',{name:'Gipuzkoa',exact:true}).check();await page.reload();await expect(page.getByRole('checkbox',{name:'Medicina',exact:true})).toBeChecked();
 expect(queries.every(url=>!url.includes('medicina')&&!url.includes('qualification')&&!url.includes('favorites'))).toBe(true);
 await page.getByRole('tab',{name:/Todas las oposiciones/}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:/Guardadas/})).toBeFocused();await expect(page.getByRole('tab',{name:/Guardadas/})).toHaveAttribute('aria-selected','true');
 const clear=page.getByRole('button',{name:'Borrar mis datos guardados',exact:true});await clear.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(clear).toBeFocused();await clear.click();await dialog.getByRole('button',{name:'Borrar todo',exact:true}).click();await expect(dialog).not.toBeVisible();await expect(page.getByRole('checkbox',{name:'Bizkaia',exact:true})).not.toBeChecked();
});
test('fetch errors expose retry and never pretend that an unavailable catalogue is empty',async({page})=>{
 let fail=true;await page.route('**/api/v1/calls?**',route=>fail?route.fulfill({status:503,json:{error:{code:'UNAVAILABLE',message:'Unavailable'}}}):route.continue());
 await page.goto('/eu');await expect(page.locator('.error-notice[role=alert]')).toContainText('Ezin izan ditugu datuak kargatu.');await expect(page.locator('.empty-state')).toHaveCount(0);fail=false;await page.getByRole('button',{name:'Saiatu berriro',exact:true}).click();await expect(page.locator('.opposition-card').first()).toBeVisible();
});
test('sources load via API and detail pages render complete data over the HTTP API',async({page})=>{
 const sourceRequest=page.waitForResponse(response=>response.url().includes('/api/v1/sources'));await page.goto('/fr/fuentes');expect((await sourceRequest).status()).toBe(200);await expect(page.locator('.detail-section').first()).toBeVisible();
 await page.goto('/es');await expect(page.locator('.opposition-card').first()).toBeVisible();await page.getByRole('link',{name:'Ver ficha',exact:true}).first().click();await expect(page.getByRole('heading',{name:'¿Qué necesitas?',exact:true})).toBeVisible();await page.goto('/es/oposiciones/does-not-exist');await expect(page.getByRole('heading',{name:'No encontramos esa oposición.',exact:true})).toBeVisible();
});
test('Swagger UI renders six endpoints and executes a real public request',async({page})=>{
 await page.goto('/api/docs');await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('.opblock-get')).toHaveCount(6);const operation=page.locator('#operations-Catalogs-getOptions');const fallback=page.locator('.opblock').filter({has:page.locator('[data-path="/options"]')});
 const block=await operation.count()?operation:fallback;await block.locator('.opblock-summary').click();await block.getByRole('button',{name:'Try it out',exact:true}).click();const response=page.waitForResponse(response=>response.url().includes('/api/v1/options')&&response.status()===200);await block.getByRole('button',{name:'Execute',exact:true}).click();await response;await expect(block.locator('.response-col_status').last()).toContainText('200');
});
test('refactored explorer is usable on mobile and passes an automated accessibility check',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/es');await expect(page.locator('.opposition-card').first()).toBeVisible();await page.getByRole('button',{name:'Mi perfil',exact:false}).click();await page.getByRole('checkbox',{name:'Grado / Diplomatura universitaria',exact:true}).check();await page.getByRole('checkbox',{name:'Ingeniería Informática',exact:true}).check();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations.map(v=>({id:v.id,description:v.description,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
});
test('frontend follows API pagination and never silently exposes a partial catalogue',async({page,request})=>{
 const response=await request.get('/api/v1/calls?limit=1');const template=(await response.json()).calls[0];
 const fixture=Array.from({length:201},(_,index)=>({...template,id:`pagination-fixture-${index}`,title:`Fixture ${index}`}));let secondPage=false;
 await page.route('**/api/v1/calls?**',route=>{const page=Number(new URL(route.request().url()).searchParams.get('page')??1);if(page===2)secondPage=true;return route.fulfill({json:{calls:fixture.slice((page-1)*200,page*200),pagination:{page,limit:200,total:201,pages:2}}});});
 await page.goto('/es');await expect(page.locator('.result-count strong')).toHaveText('201');expect(secondPage).toBe(true);
 await page.getByRole('button',{name:'Siguiente →',exact:true}).click();await expect(page.locator('#result-list')).toBeFocused();await expect(page.locator('.pagination')).toContainText('Página 2 de 11');
});
