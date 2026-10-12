import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { register } from "./helpers/auth";

// Chat del grupo (C5) entre dos cuentas nuevas: lo que escribe una aparece en
// la otra sin recargar (Realtime como señal + RPC), borrar lo propio y perder
// el acceso al ser expulsada.

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

function messages(page: Page) {
  return page.getByRole("list", { name: "Mensajes" });
}

async function send(page: Page, text: string) {
  await page.getByLabel("Mensaje", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  // Sin UI optimista: el campo se vacía cuando el servidor lo confirma.
  await expect(page.getByLabel("Mensaje", { exact: true })).toHaveValue("");
}

test("two members chat in real time, delete their own messages and lose access when removed", async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const suffix = crypto.randomUUID().slice(0, 8);
  const ownerContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const guest = await guestContext.newPage();
  const groupName = `Chat ${suffix}`;

  try {
    await register(owner, `e2e-chat-owner-${suffix}@example.test`);
    await register(guest, `e2e-chat-guest-${suffix}@example.test`);

    await guest.goto("/ajustes");
    const codeText = guest.getByTestId("user-code");
    await expect(codeText).toHaveText(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    const guestCode = (await codeText.textContent())?.trim() ?? "";

    // Grupo sin hábitos compartidos: para el chat no hacen falta.
    await owner.goto("/grupos/nuevo");
    await owner.getByLabel("Nombre del grupo").fill(groupName);
    await owner.getByRole("button", { name: "Siguiente" }).click();
    await owner.getByLabel("Tu nombre en el grupo").fill("Ana");
    await owner.getByRole("button", { name: "Crear grupo" }).click();
    await owner.getByLabel("Código de la persona").fill(guestCode);
    await owner.getByRole("button", { name: "Invitar" }).click();
    await expect(
      owner.getByRole("status").filter({ hasText: "Invitación enviada." }),
    ).toBeVisible();
    await owner.getByRole("button", { name: "Ir al grupo" }).click();
    await expect(owner).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);
    const groupUrl = owner.url();

    await guest.goto("/grupos");
    await guest.getByRole("link", { name: "Ver y unirme" }).click();
    await guest.getByLabel("Tu nombre en el grupo").fill("Beto");
    await guest.getByRole("button", { name: "Unirme" }).click();
    await expect(guest).toHaveURL(groupUrl);

    // Se entra al chat desde la vista del grupo.
    await owner.getByRole("link", { name: "Chat" }).click();
    await expect(owner).toHaveURL(`${groupUrl}/chat`);
    await expect(
      owner.getByText("Aún no hay mensajes. Escribe el primero."),
    ).toBeVisible();
    await guest.getByRole("link", { name: "Chat" }).click();
    await expect(guest).toHaveURL(`${groupUrl}/chat`);
    await expect(
      guest.getByText("Aún no hay mensajes. Escribe el primero."),
    ).toBeVisible();
    await expectNoAxeViolations(guest);

    // Lo que escribe el dueño aparece en la invitada sin recargar.
    await send(owner, "¡Hola, equipo!");
    await expect(messages(owner).getByText("¡Hola, equipo!")).toBeVisible();
    await expect(messages(guest).getByText("¡Hola, equipo!")).toBeVisible({
      timeout: 20_000,
    });
    await expect(messages(guest).getByText("Ana", { exact: true })).toBeVisible();
    await expect(guest.locator("[aria-live='polite']").first()).toContainText(
      "Nuevo mensaje de Ana",
    );

    // Y al revés.
    await send(guest, "Hecho, 5 días");
    await expect(messages(owner).getByText("Hecho, 5 días")).toBeVisible({
      timeout: 20_000,
    });
    await expectNoAxeViolations(owner);

    // Cada persona solo puede borrar lo suyo, y antes se le pide confirmación.
    const ownMessage = messages(owner)
      .getByRole("listitem")
      .filter({ hasText: "¡Hola, equipo!" });
    const otherMessage = messages(owner)
      .getByRole("listitem")
      .filter({ hasText: "Hecho, 5 días" });
    await expect(
      otherMessage.getByRole("button", { name: "Borrar mensaje" }),
    ).toHaveCount(0);
    await ownMessage.getByRole("button", { name: "Borrar mensaje" }).click();
    const dialog = owner.getByRole("dialog", { name: "¿Borrar este mensaje?" });
    await expect(dialog).toBeVisible();
    await expectNoAxeViolations(owner);
    await dialog.getByRole("button", { name: "Borrar", exact: true }).click();
    await expect(messages(owner).getByText("¡Hola, equipo!")).toHaveCount(0);
    // Los borrados no viajan por Realtime: la otra persona lo ve al refrescar.
    await guest.reload();
    await expect(messages(guest).getByText("Hecho, 5 días")).toBeVisible();
    await expect(messages(guest).getByText("¡Hola, equipo!")).toHaveCount(0);

    // Tras la expulsión, la invitada ya no lee ni escribe.
    await owner.goto(`${groupUrl}/ajustes`);
    await owner.getByRole("button", { name: "Expulsar" }).click();
    await owner.getByRole("dialog").getByRole("button", { name: "Expulsar" }).click();
    await expect(owner.getByRole("button", { name: "Expulsar" })).toHaveCount(0);

    await guest.getByLabel("Mensaje", { exact: true }).fill("¿Sigo aquí?");
    await guest.getByRole("button", { name: "Enviar mensaje" }).click();
    await expect(
      guest.getByRole("heading", { name: "Ya no formas parte de este grupo" }),
    ).toBeVisible();
    await guest.goto(`${groupUrl}/chat`);
    await expect(
      guest.getByRole("heading", { name: "Ya no formas parte de este grupo" }),
    ).toBeVisible();

    // Sus mensajes se conservan como "Antiguo miembro".
    await owner.goto(`${groupUrl}/chat`);
    const formerMessage = messages(owner)
      .getByRole("listitem")
      .filter({ hasText: "Hecho, 5 días" });
    await expect(formerMessage.getByText("Antiguo miembro")).toBeVisible();
  } finally {
    await ownerContext.close();
    await guestContext.close();
  }
});
