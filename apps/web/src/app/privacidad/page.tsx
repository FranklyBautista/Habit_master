import Link from "next/link";

import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Política de privacidad",
};

// Correo de la app al que se dirigen las solicitudes de acceso o borrado de datos.
const CONTACT_EMAIL = "habitmaster67@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="main-content">
      <Card className="privacy-policy">
        <h1>Política de privacidad</h1>
        <p className="privacy-updated">
          Última actualización: 23 de septiembre de 2026
        </p>
        <p>
          Constancia es una aplicación personal para registrar hábitos diarios,
          disponible en la web y en Android/iOS. Esta política explica qué datos guarda
          y para qué.
        </p>

        <h2>Qué datos guardamos</h2>
        <ul>
          <li>Tu correo electrónico y una contraseña cifrada, para iniciar sesión.</li>
          <li>
            Tu nombre visible, zona horaria e idioma, si los configuras en Ajustes.
          </li>
          <li>
            Los hábitos que creas (nombre, descripción, color, icono, orden y fecha de
            archivado) y los días en que los marcas como completados.
          </li>
        </ul>

        <h2>Para qué los usamos</h2>
        <p>
          Solo para que la aplicación funcione: mostrar tus hábitos, calcular rachas y
          estadísticas, y sincronizar los mismos datos entre tus dispositivos. La zona
          horaria sirve para asignar cada check-in al día correcto.
        </p>

        <h2>Dónde se guardan</h2>
        <p>
          En una base de datos de Supabase. Cada cuenta solo puede leer y modificar sus
          propios datos. La web se sirve desde Vercel, que registra datos técnicos de
          las peticiones (como la dirección IP) para operar el servicio.
        </p>

        <h2>Lo que no hacemos</h2>
        <ul>
          <li>
            No vendemos ni compartimos tus datos con terceros con fines comerciales.
          </li>
          <li>No mostramos publicidad.</li>
          <li>No usamos herramientas de analítica ni seguimiento.</li>
        </ul>

        <h2>Recordatorios en el móvil</h2>
        <p>
          Si activas el recordatorio diario en la app móvil, la hora elegida se guarda
          solo en tu dispositivo y la notificación la programa el propio sistema
          operativo. No se envía a nuestros servidores.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Puedes pedir una copia de tus datos o la eliminación de tu cuenta y de todos
          sus datos escribiendo a{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Al eliminar la cuenta
          se borran tus hábitos y check-ins.
        </p>

        <h2>Cambios</h2>
        <p>
          Si esta política cambia, actualizaremos la fecha de arriba. Los cambios
          importantes se avisarán dentro de la aplicación.
        </p>

        <p>
          <Link href="/hoy">Volver a Constancia</Link>
        </p>
      </Card>
    </main>
  );
}
