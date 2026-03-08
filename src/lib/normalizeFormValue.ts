type NormalizeFormValueOptions = {
  arraySeparator?: string;
  nullishFallback?: string;
  preserveObjects?: boolean;
  /** When set, each item in an array gets this prefix */
  itemPrefix?: string;
  /** When set, each item in an array gets this suffix */
  itemSuffix?: string;
};

export const normalizeFormValue = (
  value: unknown,
  {
    arraySeparator = "\n",
    nullishFallback = "",
    preserveObjects = false,
    itemPrefix = "",
    itemSuffix = "",
  }: NormalizeFormValueOptions = {}
): string => {
  if (value === null || value === undefined) return nullishFallback;

  const formatItem = (item: unknown): string => {
    const s = String(item);
    if (!itemPrefix && !itemSuffix) return s;
    return `${itemPrefix}${s}${itemSuffix ? " " + itemSuffix : ""}`;
  };

  if (Array.isArray(value)) {
    return value.map(formatItem).join(arraySeparator);
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (typeof value === "object") {
    if (preserveObjects) return JSON.stringify(value);
    return nullishFallback;
  }

  const stringValue = String(value);

  // Normalize string booleans from checkboxes
  const lower = stringValue.toLowerCase();
  if (lower === "true") return "Sim";
  if (lower === "false") return "Não";

  if (stringValue.startsWith("[") && stringValue.endsWith("]")) {
    try {
      const parsed = JSON.parse(stringValue);
      if (Array.isArray(parsed)) {
        return parsed.map(formatItem).join(arraySeparator);
      }
    } catch {
      // noop
    }
  }

  // Handle already newline/space-separated multi-values for prefix/suffix
  if ((itemPrefix || itemSuffix) && stringValue.includes("\n")) {
    return stringValue
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        return formatItem(trimmed);
      })
      .filter(Boolean)
      .join(arraySeparator);
  }

  if (itemPrefix || itemSuffix) return formatItem(stringValue);
  return stringValue;
};

