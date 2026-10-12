import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { register } from "./helpers/auth";

// Grupos de hábitos (ADR 0002) entre dos cuentas nuevas: invitar por código,
// aceptar compartiendo un hábito y ver el check-in del otro miembro.

async function createHabit(page: Page, name: string) {
  await page.goto("/habitos");
  await page.getByRole("button", { name: "Crear hábito", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Crear hábito" });
  await dialog.getByLabel("Nombre").fill(name);
  await dialog.getByRole("button", { name: "Crear hábito" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test("two people share habits in a group and see each other's check-ins", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const suffix = crypto.randomUUID().slice(0, 8);
  const ownerContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const guest = await guestContext.newPage();
  const ownerHabit = `Meditar ${suffix}`;
  const guestHabit = `Caminar ${suffix}`;
  const groupName = `Familia ${suffix}`;

  try {
    await register(owner, `e2e-group-owner-${suffix}@example.test`);
    await register(guest, `e2e-group-guest-${suffix}@example.test`);
    await createHabit(owner, ownerHabit);
    await createHabit(guest, guestHabit);

    // La invitada lee su código en Ajustes.
    await guest.goto("/ajustes");
    const codeText = guest.getByTestId("user-code");
    await expect(codeText).toHaveText(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    const guestCode = (await codeText.textContent())?.trim() ?? "";

    // El dueño crea el grupo compartiendo su hábito e invita con el código.
    await owner.goto("/grupos/nuevo");
    await owner.getByLabel("Nombre del grupo").fill(groupName);
    await owner.getByRole("button", { name: "Siguiente" }).click();
    // Las cuentas nuevas no tienen nombre visible: se pide antes de entrar.
    await owner.getByLabel("Tu nombre en el grupo").fill("Ana");
    await owner.getByRole("checkbox", { name: ownerHabit }).check();
    await owner.getByRole("button", { name: "Crear grupo" }).click();
    await owner.getByLabel("Código de la persona").fill(guestCode.toLowerCase());
    await owner.getByRole("button", { name: "Invitar" }).click();
    await expect(
      owner.getByRole("status").filter({ hasText: "Invitación enviada." }),
    ).toBeVisible();
    await owner.getByRole("button", { name: "Ir al grupo" }).click();
    await expect(owner).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);
    await expect(
      owner.getByRole("heading", { level: 1, name: groupName }),
    ).toBeVisible();
    const groupUrl = owner.url();

    // La invitada ve la invitación y se une compartiendo su hábito.
    await guest.goto("/grupos");
    await expect(guest.getByText(`«${groupName}»`)).toBeVisible();
    await expectNoAxeViolations(guest);
    await guest.getByRole("link", { name: "Ver y unirme" }).click();
    await guest.getByLabel("Tu nombre en el grupo").fill("Beto");
    await guest.getByRole("checkbox", { name: guestHabit }).check();
    await guest.getByRole("button", { name: "Unirme" }).click();
    await expect(guest).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);

    // Ve el hábito del dueño, no sus hábitos sin compartir.
    const ownerCard = guest.getByRole("article", { name: "Ana · dueño" });
    await expect(ownerCard.getByText(ownerHabit)).toBeVisible();
    await expect(ownerCard.getByText("✗ pendiente hoy")).toBeVisible();

    // Marca su hábito hoy desde la tarjeta propia.
    const guestCard = guest.getByRole("article", { name: "Beto (tú)" });
    const ownCheckbox = guestCard.getByRole("checkbox", {
      name: new RegExp(guestHabit),
    });
    // Sin UI optimista (ADR 0001): la casilla cambia cuando el servidor
    // confirma, así que `check()` (que exige el cambio inmediato) no sirve.
    await ownCheckbox.click();
    await expect(ownCheckbox).toBeChecked();
    await expectNoAxeViolations(guest);

    // El dueño ve el check-in de la invitada.
    await owner.goto(groupUrl);
    const memberCard = owner.getByRole("article", { name: "Beto" });
    await expect(memberCard.getByText(guestHabit)).toBeVisible();
    await expect(memberCard.getByText("✓ hecho hoy")).toBeVisible();
    await expect(owner.getByText("Hoy: 1 de 2 al día")).toBeVisible();
    // Mascota (C6): con 1 de 2 al día ya comió.
    const pet = owner.getByRole("article", { name: "Pulpito" });
    await expect(
      pet.getByRole("img", { name: /^Pulpito del grupo, etapa Cría, contenta$/ }),
    ).toBeVisible();
    await expect(pet.getByText("Ya comió: 1 de 2 al día.")).toBeVisible();
    await expectNoAxeViolations(owner);
  } finally {
    await ownerContext.close();
    await guestContext.close();
  }
});
