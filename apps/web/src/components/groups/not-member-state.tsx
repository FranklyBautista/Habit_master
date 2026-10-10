import { ArrowLeft, UserX } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";

/** El servidor respondió que no eres miembro: expulsión, salida o grupo borrado. */
export function NotMemberState() {
  return (
    <Card className="empty-page-state" role="status">
      <span className="state-icon">
        <UserX size={23} />
      </span>
      <h1 className="group-state-title">Ya no formas parte de este grupo</h1>
      <p>
        Puede que te hayan expulsado, que hayas salido o que el grupo se haya borrado.
      </p>
      <Link className="button button--secondary button--default" href="/grupos">
        <ArrowLeft size={17} /> Volver a grupos
      </Link>
    </Card>
  );
}
