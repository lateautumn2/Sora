export type FormActionState<FieldName extends string = string> = {
  status?: "idle" | "success" | "error";
  fieldErrors?: Partial<Record<FieldName, string>>;
  formError?: string;
};
