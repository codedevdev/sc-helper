import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string;
}

interface SearchableSelectProps {
  id?: string;
  label?: string;
  value: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  allOption?: SearchableSelectOption;
  disabled?: boolean;
  className?: string;
  onValueChange: (value: string) => void;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function matchesOption(option: SearchableSelectOption, query: string): boolean {
  if (!query) return true;
  const haystack = `${option.label} ${option.keywords ?? ""} ${option.value}`.toLowerCase();
  return haystack.includes(query);
}

function highlightMatch(label: string, query: string): ReactNode {
  if (!query) return label;
  const idx = label.toLowerCase().indexOf(query);
  if (idx < 0) return label;
  return (
    <>
      {label.slice(0, idx)}
      <mark className="rounded bg-primary/20 px-0.5 text-inherit">{label.slice(idx, idx + query.length)}</mark>
      {label.slice(idx + query.length)}
    </>
  );
}

export function SearchableSelect({
  id: idProp,
  label,
  value,
  options,
  placeholder = "Search…",
  emptyLabel = "No matches",
  allOption,
  disabled,
  className,
  onValueChange,
}: SearchableSelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  const selectedLabel = useMemo(() => {
    if (allOption && value === allOption.value) return allOption.label;
    return options.find((o) => o.value === value)?.label ?? "";
  }, [allOption, options, value]);

  const filtered = useMemo(() => {
    const q = normalizeQuery(query);
    const base = options.filter((o) => matchesOption(o, q));
    if (allOption && matchesOption(allOption, q)) {
      return [allOption, ...base];
    }
    return base;
  }, [allOption, options, query]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function selectOption(option: SearchableSelectOption) {
    onValueChange(option.value);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLButtonElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === "Enter" && filtered[highlightIndex]) {
      e.preventDefault();
      selectOption(filtered[highlightIndex]);
    }
  }

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  const dropdown =
    open && position
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 rounded-md border bg-popover text-popover-foreground shadow-md"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
          >
            <div className="border-b border-border/60 p-2">
              <Input
                autoFocus
                value={query}
                placeholder={placeholder}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-60 overflow-y-auto p-1 [scrollbar-color:hsl(var(--muted-foreground)/0.4)_transparent] [scrollbar-width:thin]"
            >
              {filtered.length === 0 && (
                <li className="px-2 py-2 text-sm text-muted-foreground">{emptyLabel}</li>
              )}
              {filtered.map((option, index) => {
                const selected = option.value === value;
                const q = normalizeQuery(query);
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex cursor-default items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm",
                      index === highlightIndex && "bg-accent text-accent-foreground",
                      selected && index !== highlightIndex && "bg-muted/50",
                    )}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectOption(option)}
                  >
                    <span className="truncate">{highlightMatch(option.label, q)}</span>
                    {selected && <Check className="size-4 shrink-0 text-primary" />}
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selectedLabel && "text-muted-foreground",
        )}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className={cn("size-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>
      {dropdown}
    </div>
  );
}
