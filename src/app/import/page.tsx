import { Suspense } from "react";
import { ImportWizard } from "./import-wizard";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <Suspense>
      <ImportWizard />
    </Suspense>
  );
}
