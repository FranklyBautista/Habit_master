import { expect, test } from "@playwright/test";

import { login } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(() => localStorage.clear());
  await login(page);
});

test("creates, checks, unchecks, archives and reviews statistics", async ({ page }) => {
  const habitName = `Hidratarse ${crypto.randomUUID().slice(0, 8)}`;
  await page.goto("/habitos");

  await page.getByRole("button", { name: "Crear hábito", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Crear hábito" });
  await dialog.getByLabel("Nombre").fill(habitName);
  await dialog.getByLabel("Descripción").fill("Un vaso al despertar");
  await dialog.getByRole("button", { name: "Crear hábito" }).click();
  await expect(page.getByText(habitName, { exact: true })).toBeVisible();

  await page.goto("/hoy");
  const checkbox = page.getByRole("checkbox", { name: habitName });
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: habitName })).toBeChecked();
  await page.getByRole("checkbox", { name: habitName }).click();
  await expect(page.getByRole("checkbox", { name: habitName })).not.toBeChecked();

  await page.goto("/habitos");
  await page.getByRole("button", { name: `Archivar ${habitName}` }).click();
  await expect(
    page.getByRole("button", { name: `Restaurar ${habitName}` }),
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
