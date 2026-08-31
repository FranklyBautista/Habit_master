import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/hoy");
  await page.evaluate(() => localStorage.clear());
});

test("creates, checks, unchecks, archives and reviews statistics", async ({ page }) => {
  await page.goto("/habitos");

  await page.getByRole("button", { name: "Crear hábito", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Crear hábito" });
  await dialog.getByLabel("Nombre").fill("Hidratarse E2E");
  await dialog.getByLabel("Descripción").fill("Un vaso al despertar");
  await dialog.getByRole("button", { name: "Crear hábito" }).click();
  await expect(page.getByText("Hidratarse E2E", { exact: true })).toBeVisible();

  await page.goto("/hoy");
  const checkbox = page.getByRole("checkbox", { name: /Hidratarse E2E/ });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /Hidratarse E2E/ })).toBeChecked();
  await page.getByRole("checkbox", { name: /Hidratarse E2E/ }).uncheck();
  await expect(
    page.getByRole("checkbox", { name: /Hidratarse E2E/ }),
  ).not.toBeChecked();

  await page.goto("/habitos");
  await page.getByRole("button", { name: "Archivar Hidratarse E2E" }).click();
  await expect(
    page.getByRole("button", { name: "Restaurar Hidratarse E2E" }),
  ).toBeVisible();

  await page.goto("/estadisticas");
  await expect(page.getByRole("heading", { name: "Estadísticas" })).toBeVisible();
  await page.getByRole("button", { name: "7 días" }).click();
  await expect(page.getByText("Últimos 7 días", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resumen por hábito" })).toBeVisible();
});

test("prevents empty and overlong habit names", async ({ page }) => {
  await page.goto("/habitos");
  await page.getByRole("button", { name: "Crear hábito", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Crear hábito" });
  const name = dialog.getByLabel("Nombre");
  await dialog.getByRole("button", { name: "Crear hábito" }).click();
  await expect(name).toBeFocused();
  expect(await name.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(
    false,
  );
  await expect(name).toHaveAttribute("maxlength", "60");

  await name.pressSequentially("a".repeat(61));
  await expect(name).toHaveValue("a".repeat(60));
});
