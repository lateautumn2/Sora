import { Children, cloneElement, isValidElement, useId } from "react";
import type { AriaAttributes, ReactElement, ReactNode } from "react";

import { cn } from "./cn";
import { FormMessage } from "./form-message";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
};

interface FieldProps {
  children: ReactElement<FieldControlProps>;
  className?: string;
  description?: ReactNode;
  error?: ReactNode;
  label: ReactNode;
}

export function Field({ children, className, description, error, label }: FieldProps) {
  const generatedId = useId();
  const control = Children.only(children);

  if (!isValidElement<FieldControlProps>(control)) {
    throw new Error("Field requires a single form control child.");
  }

  const controlId = control.props.id ?? `field-${generatedId}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [control.props["aria-describedby"], descriptionId, errorId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("ui-field", className)}>
      <label className="ui-field-label" htmlFor={controlId}>
        {label}
      </label>
      {cloneElement(control, {
        id: controlId,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : control.props["aria-invalid"],
      })}
      {description ? (
        <p className="ui-field-description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? <FormMessage id={errorId}>{error}</FormMessage> : null}
    </div>
  );
}
