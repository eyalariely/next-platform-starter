import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Wraps ticker/number/currency/percent/date content so it always renders LTR
 * even inside the RTL document, per spec §2 ("טיקרים, מספרים, אחוזים,
 * מטבעות, תאריכים... יוצגו LTR בתוך הממשק").
 */
function Numeric({
  className,
  as: Component = "span",
  ...props
}: React.ComponentProps<"span"> & { as?: React.ElementType }) {
  return (
    <Component
      data-slot="numeric"
      className={cn("ltr-numeric", className)}
      {...props}
    />
  );
}

export { Numeric };
