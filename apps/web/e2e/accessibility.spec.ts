import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = ["/hoy", "/habitos", "/calendario", "/estadisticas", "/ajustes"];

test.beforeEach(async ({ page }) => {
  await page.goto("/hoy");
  await page.evaluate(() => localStorage.clear());
});

for (const route of routes) {
  test(`${route} has no automatically detectable accessibility violations`, async ({
    page,
  }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("supports the main keyboard path and dialog focus", async ({ page }) => {
  await page.goto("/habitos");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contenido")).toBeFocused();

  const createButton = page.getByRole("button", { name: "Crear hábito", exact: true });
  await createButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Crear hábito" })).toBeVisible();
  await expect(page.getByLabel("Nombre")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Crear hábito" })).not.toBeVisible();
});
