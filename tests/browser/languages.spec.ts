import {test,expect}from'@playwright/test';
const titles={es:'Tu próxima oportunidad',eu:'Zure hurrengo aukera',fr:'Votre prochaine opportunité'};
test('all locale URLs render translated HTML, metadata and source pages on the server',async({request})=>{
 for(const locale of ['es','eu','fr']as const){const response=await request.get('/'+locale);expect(response.status()).toBe(200);const html=await response.text();expect(html).toContain(`<html lang="${locale}">`);expect(html).toContain(titles[locale]);}
 const sources=await request.get('/fr/fuentes');expect(sources.status()).toBe(200);expect(await sources.text()).toContain('Sources et couverture');
 expect((await request.get('/de')).status()).toBe(404);expect((await request.get('/fr/api/convocatorias')).status()).toBe(404);
});
test('language switches preserve filters, favorites, the current page and original official content',async({page,request})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/es');await page.getByRole('checkbox',{name:'Bizkaia',exact:true}).check();await page.getByRole('checkbox',{name:'Administración',exact:true}).check();
 await page.getByRole('checkbox',{name:'Bachillerato',exact:true}).check();
 const first=page.locator('.opposition-card').first();const title=await first.getByRole('heading').innerText();const href=await first.getByRole('link',{name:'Ver ficha',exact:true}).getAttribute('href');
 await first.locator('.bookmark-button').click();
 await page.getByRole('button',{name:'Euskara',exact:true}).click();await expect(page).toHaveURL(/\/eu$/);await expect(page.locator('html')).toHaveAttribute('lang','eu');
 await expect(page.getByRole('heading',{name:titles.eu,exact:true})).toBeVisible();await expect(page.getByRole('checkbox',{name:'Administrazioa',exact:true})).toBeChecked();await expect(page.getByRole('checkbox',{name:'Batxilergoa',exact:true})).toBeChecked();
 await page.getByRole('link',{name:'Ikusi fitxa',exact:true}).first().click();await expect(page).toHaveURL(/\/eu\/oposiciones\//);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Français',exact:true}).click();await expect(page).toHaveURL(/\/fr\/oposiciones\//);await expect(page.locator('html')).toHaveAttribute('lang','fr');
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Quelles conditions remplir ?',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Enregistré',exact:true})).toHaveAttribute('aria-pressed','true');
 const {calls}=await(await request.get('/api/convocatorias')).json();const id=href!.split('/').pop();const call=calls.find((c:{id:string})=>c.id===id);
 await expect(page.getByRole('link',{name:call.isDemo?'Consulter le portail officiel de l’emploi':'Consulter la fiche officielle',exact:true})).toHaveAttribute('href',call.sourceUrl);
 await page.getByRole('link',{name:'Retour à la recherche',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Biscaye',exact:true})).toBeChecked();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('oposaketia:profile:v1')!));expect(stored).toMatchObject({provinces:['Bizkaia'],categories:['Administración'],qualifications:['bachiller']});expect(stored.favorites).toContain(id);
 await page.getByRole('link',{name:'Sources',exact:true}).click();await expect(page).toHaveURL(/\/fr\/fuentes$/);await expect(page.getByRole('heading',{name:'Sources et couverture',exact:true})).toBeVisible();
 await page.goto('/');await expect(page).toHaveURL(/\/fr$/);await expect(page.getByRole('heading',{name:titles.fr,exact:true})).toBeVisible();expect(errors).toEqual([]);
});
test('language selectors, multi-select filters and translated 404 pages work on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const locale of ['es','eu','fr']as const){await page.goto('/'+locale);await expect(page.getByRole('heading',{name:titles[locale],exact:true})).toBeVisible();await expect(page.getByTestId('language-switcher')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByRole('checkbox',{name:'Santé',exact:true}).check();await page.getByRole('checkbox',{name:'Services',exact:true}).check();await page.reload();await expect(page.getByRole('checkbox',{name:'Santé',exact:true})).toBeChecked();
 await page.goto('/eu/oposiciones/no-existe');await expect(page.getByRole('heading',{name:'Ez dugu oposizio hori aurkitu.',exact:true})).toBeVisible();await expect(page.locator('html')).toHaveAttribute('lang','eu');
});
test('explicit language URLs remain usable when localStorage is unavailable',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
 await page.goto('/fr');await expect(page.getByRole('heading',{name:titles.fr,exact:true})).toBeVisible();await page.getByRole('button',{name:'Euskara',exact:true}).click();await expect(page.getByRole('heading',{name:titles.eu,exact:true})).toBeVisible();
});
