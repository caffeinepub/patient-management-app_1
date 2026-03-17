import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Pencil, Plus, X } from "lucide-react";
import { useRef, useState } from "react";

interface CustomBadgeAdderProps {
  /** examData field that holds the selected values (string for single, string[] for multi) */
  field: string;
  /** examData field that holds the custom options list, e.g. "custom_chest_shape" */
  customField: string;
  examData: any;
  isMulti?: boolean;
  accentColor?: string; // e.g. "teal-600"
  onUpdate: (patch: Record<string, any>) => void;
  placeholder?: string;
}

export default function CustomBadgeAdder({
  field,
  customField,
  examData,
  isMulti = true,
  accentColor = "teal-600",
  onUpdate,
  placeholder = "Add custom finding...",
}: CustomBadgeAdderProps) {
  const [inputVal, setInputVal] = useState("");
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const customOptions: string[] = examData[customField] || [];
  const selected: string | string[] = examData[field] ?? (isMulti ? [] : "");

  const isSelected = (val: string) =>
    isMulti ? (selected as string[]).includes(val) : selected === val;

  const toggleValue = (val: string) => {
    if (isMulti) {
      const cur = (selected as string[]) || [];
      onUpdate({
        [field]: cur.includes(val)
          ? cur.filter((v) => v !== val)
          : [...cur, val],
      });
    } else {
      onUpdate({ [field]: selected === val ? "" : val });
    }
  };

  const addCustom = () => {
    const trimmed = inputVal.trim();
    if (!trimmed || customOptions.includes(trimmed)) return;
    const newOptions = [...customOptions, trimmed];
    const patch: Record<string, any> = { [customField]: newOptions };
    // auto-select the newly added badge
    if (isMulti) {
      patch[field] = [...((selected as string[]) || []), trimmed];
    } else {
      patch[field] = trimmed;
    }
    onUpdate(patch);
    setInputVal("");
  };

  const startEdit = (val: string) => {
    setEditingValue(val);
    setEditText(val);
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    if (!editingValue) return;
    const newText = editText.trim();
    if (!newText || newText === editingValue) {
      setEditingValue(null);
      return;
    }
    const newOptions = customOptions.map((o) =>
      o === editingValue ? newText : o,
    );
    const patch: Record<string, any> = { [customField]: newOptions };
    if (isMulti) {
      const cur = (selected as string[]) || [];
      patch[field] = cur.map((v) => (v === editingValue ? newText : v));
    } else {
      if (selected === editingValue) patch[field] = newText;
    }
    onUpdate(patch);
    setEditingValue(null);
  };

  const deleteCustom = (val: string) => {
    const newOptions = customOptions.filter((o) => o !== val);
    const patch: Record<string, any> = { [customField]: newOptions };
    if (isMulti) {
      patch[field] = ((selected as string[]) || []).filter((v) => v !== val);
    } else {
      if (selected === val) patch[field] = "";
    }
    onUpdate(patch);
  };

  return (
    <div className="space-y-2">
      {/* Custom badges */}
      {customOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customOptions.map((opt) => {
            const active = isSelected(opt);
            if (editingValue === opt) {
              return (
                <div key={opt} className="flex items-center gap-1">
                  <Input
                    ref={editRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") setEditingValue(null);
                    }}
                    className="h-7 text-xs w-36 px-2"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-green-600"
                    onClick={commitEdit}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              );
            }
            return (
              <Badge
                key={opt}
                variant={active ? "default" : "outline"}
                className={`cursor-pointer text-sm py-2 px-2 flex items-center gap-1 group ${
                  active ? `bg-${accentColor}` : ""
                }`}
                onClick={() => toggleValue(opt)}
              >
                <span>{opt}</span>
                <button
                  type="button"
                  className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(opt);
                  }}
                  title="Edit"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCustom(opt);
                  }}
                  title="Delete"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Add new custom finding */}
      <div className="flex items-center gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder={placeholder}
          className="h-8 text-xs flex-1 max-w-xs"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 flex-shrink-0"
          onClick={addCustom}
          disabled={!inputVal.trim()}
          title="Add custom finding"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
