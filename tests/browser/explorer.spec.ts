import { expect, test } from '@playwright/test';
test.skip(process.env.TEST_CATALOGUE === 'official', 'Estas pruebas requieren el catálogo demo.');
const key = 'oposaketia:profile:v1';
test('filters, favorites and searches survive navigation and can be erased', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/es');
  await expect(page.getByRole('heading', { name: 'Explorar oposiciones' })).toBeVisible();
  await expect(page.locator('.opposition-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Añadir a favoritos: Enfermero/a', exact: true }).click();
  await page.reload();
  await expect(page.locator('.opposition-card')).toHaveCount(6);
  await page.getByRole('tab', { name: /Guardadas/ }).click();
  await expect(page.locator('.opposition-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Ver ficha' }).click();
  await expect(page.getByRole('heading', { name: 'Enfermero/a', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardada', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Ejemplo de bloques del temario' })).toBeVisible();
  await page.getByRole('link', { name: 'Volver al buscador' }).click();
  await page.getByRole('searchbox', { name: 'Buscar por puesto, administración o localidad' }).fill('enfermero');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.locator('.opposition-card')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('searchbox')).toHaveValue('enfermero');
  await expect(page.getByRole('button', { name: 'enfermero', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Borrar mis datos guardados' }).click();
  await page.getByRole('button', { name: 'Borrar todo', exact: true }).click();
  await expect(page.locator('.opposition-card')).toHaveCount(6);
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
  expect(errors).toEqual([]);
});
test('invalid local storage recovers without crashing', async ({ page }) => {
  await page.addInitScript(k => localStorage.setItem(k, '{broken'), key);
  await page.goto('/es');
  await expect(page.locator('.opposition-card')).toHaveCount(6);
  await expect(page.locator('.storage-error')).toContainText('No se pudieron recuperar');
  await page.getByRole('searchbox', { name: 'Buscar por puesto, administración o localidad' }).fill('enfermero');
  await expect(page.locator('.storage-error')).toHaveCount(0);
});
test('mobile filters and empty state work without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/es');
  await page.getByRole('checkbox', { name: 'Navarra', exact: true }).check();
  await page.getByRole('searchbox', { name: 'Buscar por puesto, administración o localidad' }).fill('sin-resultados');
  await expect(page.getByRole('heading', { name: 'Vamos a ampliar la búsqueda' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Ver todas las oposiciones' }).click();
  await expect(page.locator('.opposition-card')).toHaveCount(6);
});
test('disabled browser storage still allows filtering in memory', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
  });
  await page.goto('/es');
  await page.getByRole('checkbox', { name: 'Navarra', exact: true }).check();
  await expect(page.locator('.opposition-card')).toHaveCount(2);
  await expect(page.locator('.storage-error')).toContainText('No se pudieron recuperar');
});
test('unknown call returns an accessible not-found page', async ({ page }) => {
  await page.goto('/es/oposiciones/no-existe');
  await expect(page.getByRole('heading', { name: 'No encontramos esa oposición.' })).toBeVisible();
});
