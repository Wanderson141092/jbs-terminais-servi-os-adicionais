type NormalizeFormValueOptions = {
  arraySeparator?: string;
  nullishFallback?: string;
  preserveObjects?: boolean;
};

export const normalizeFormValue = (
  value: unknown,
  {
    arraySeparator = " ",
    nullishFallback = "",
    preserveObjects = false,
  }: NormalizeFormValueOptions = {}
): string => {
  if (value === null || value === undefined) return nullishFallback;

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(arraySeparator);
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (typeof value === "object") {
    if (preserveObjects) return JSON.stringify(value);
    return nullishFallback;
  }

  const stringValue = String(value);
  if (stringValue.startsWith("[") && stringValue.endsWith("]")) {
    try {
      const parsed = JSON.parse(stringValue);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item)).join(arraySeparator);
      }
    } catch {
      // noop
    }
  }

  return stringValue;
};

