import { doctors } from "@/data/doctorsData";
import type { DoctorKey } from "@/data/doctorsData";
import { useCallback, useState } from "react";

const STORAGE_KEY = "doctorContentOverrides";

type Overrides = Record<string, any>;

function loadOverrides(): Overrides {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveOverrides(overrides: Overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function deepMerge(base: any, overrides: Record<string, any>): any {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (Array.isArray(value)) {
      // Arrays always replace (never recurse) — important for chambers array
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
    (doctorKey: DoctorKey) => {
      const base = doctors[doctorKey];
      const docOverrides = overrides[doctorKey] || {};
      return deepMerge(base, docOverrides);
    },
    [overrides],
  );

  const updateField = useCallback(
    (doctorKey: DoctorKey, path: string, value: any) => {
      setOverrides((prev) => {
        const updated = { ...prev };
        if (!updated[doctorKey]) updated[doctorKey] = {};
        // Support dot-notation paths like "chamber.address"
        const parts = path.split(".");
        let obj = updated[doctorKey];
        for (let i = 0; i < parts.length - 1; i++) {
          if (!obj[parts[i]] || typeof obj[parts[i]] !== "object") {
            obj[parts[i]] = {};
          }
          obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
        saveOverrides(updated);
        return updated;
      });
    },
    [],
  );

  const updateChambers = useCallback(
    (doctorKey: DoctorKey, chambers: any[]) => {
      setOverrides((prev) => {
        const updated = {
          ...prev,
          [doctorKey]: { ...(prev[doctorKey] || {}), chambers },
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
