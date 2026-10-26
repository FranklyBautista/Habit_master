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

  // Reordenar pasa por la RPC `reorder_habits`: el orden debe sobrevivir a
  // una recarga (posiciones únicas entre hábitos activos). Se ordena
  // arrastrando el asa; con el teclado, flechas sobre el asa enfocada.
  const rowIndex = async () =>
    (await page.locator(".habit-row").allInnerTexts()).findIndex((text) =>
      text.includes(habitName),
    );
  const handle = (name: string) =>
    page.getByRole("button", { name: `Reordenar ${name}` });
  const createdIndex = await rowIndex();
  expect(createdIndex).toBeGreaterThan(0);
  await handle(habitName).focus();
  await page.keyboard.press("ArrowUp");
  await expect.poll(rowIndex).toBe(createdIndex - 1);
  await page.reload();
  await expect.poll(rowIndex).toBe(createdIndex - 1);

  // Arrastrar con el puntero: soltarlo sobre la fila de arriba lo sube otra.
  if (createdIndex - 1 > 0) {
    const from = await handle(habitName).boundingBox();
    const target = await page
      .locator(".habit-row")
      .nth(createdIndex - 2)
      .boundingBox();
    expect(from && target).toBeTruthy();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(from!.x + from!.width / 2, target!.y + 4, { steps: 8 });
    await page.mouse.up();
    await expect.poll(rowIndex).toBe(createdIndex - 2);
  }

  await page.goto("/hoy");
  const checkbox = page.getByRole("checkbox", { name: habitName });
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: habitName })).toBeChecked();
  await page.getByRole("checkbox", { name: habitName }).click();
  await expect(page.getByRole("checkbox", { name: habitName })).not.toBeChecked();

  await page.goto("/habitos");
  const archive = async () => {
    await page.getByRole("button", { name: `Más acciones para ${habitName}` }).click();
    await page
      .getByRole("menu", { name: `Acciones de ${habitName}` })
      .getByRole("menuitem", { name: "Archivar" })
      .click();
  };
  await archive();
  await expect(
    page.getByRole("button", { name: `Restaurar ${habitName}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Restaurar ${habitName}` }).click();
  await expect(handle(habitName)).toBeVisible();
  await archive();
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
