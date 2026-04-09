import { doctors } from "@/data/doctorsData";
import type { DoctorKey } from "@/data/doctorsData";
import { useCallback, useState } from "react";

const STORAGE_KEY = "doctorContentOverrides";

// Use any for override storage since content shape is dynamic
// biome-ignore lint/suspicious/noExplicitAny: dynamic content overrides
type Overrides = Record<string, any>;

function loadOverrides(): Overrides {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Overrides;
  } catch {
    return {};
  }
}

function saveOverrides(overrides: Overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic deep merge
function deepMerge(base: any, overrides: Record<string, any>): any {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (Array.isArray(value)) {
      result[key] = value;
    } else if (
      value !== null &&
      typeof value === "object" &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function useDoctorContent() {
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides);

  const getContent = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: returns merged doctor data shape
    (doctorKey: DoctorKey): any => {
      const base = doctors[doctorKey];
      const docOverrides = (overrides[doctorKey] || {}) as Overrides;
      return deepMerge(base, docOverrides);
    },
    [overrides],
  );

  const updateField = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: dynamic field value
    (doctorKey: DoctorKey, path: string, value: any) => {
      setOverrides((prev) => {
        const updated = { ...prev };
        if (!updated[doctorKey]) updated[doctorKey] = {};
        const parts = path.split(".");
        let obj = updated[doctorKey] as Overrides;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!obj[parts[i]] || typeof obj[parts[i]] !== "object") {
            obj[parts[i]] = {};
          }
          obj = obj[parts[i]] as Overrides;
        }
        obj[parts[parts.length - 1]] = value;
        saveOverrides(updated);
        return updated;
      });
    },
    [],
  );

  const updateChambers = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: dynamic chambers array
    (doctorKey: DoctorKey, chambers: any[]) => {
      setOverrides((prev) => {
        const updated = {
          ...prev,
          [doctorKey]: {
            ...((prev[doctorKey] as Overrides) || {}),
            chambers,
          },
        };
        saveOverrides(updated);
        return updated;
      });
    },
    [],
  );

  const getAll = useCallback(() => {
    return {
      arman: getContent("arman"),
      samia: getContent("samia"),
    };
  }, [getContent]);

  return { getContent, updateField, updateChambers, getAll };
}
