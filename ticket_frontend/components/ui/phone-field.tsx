"use client";

import {
  ComponentType,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import PhoneInput from "react-phone-number-input";
import type { Country, Value as PhoneValue } from "react-phone-number-input";
import "react-phone-number-input/style.css";

// ── Types from the package's countrySelectComponent contract ─────────────────
type FlagProps = {
  country: Country;
  countryName: string;
  flagUrl?: string;
  className?: string;
};

type CountryOption = {
  value: Country | undefined;
  label: string;
  divider?: boolean;
};

type CountrySelectProps = {
  value: Country | undefined;
  onChange: (country: Country | undefined) => void;
  onFocus: () => void;
  onBlur: () => void;
  options: CountryOption[];
  iconComponent: ComponentType<FlagProps>;
  disabled?: boolean;
  readOnly?: boolean;
  tabIndex?: number | string;
  className?: string;
  name?: string;
};

// ── Searchable country select ────────────────────────────────────────────────
function SearchableCountrySelect({
  value,
  onChange,
  onFocus,
  onBlur,
  options,
  iconComponent: Flag,
  disabled,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const realOptions = options.filter((o) => !o.divider);
  const filtered = search.trim()
    ? realOptions.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : realOptions;

  const selected = realOptions.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  function handleToggle() {
    if (disabled) return;
    setOpen((v) => !v);
    if (!open) onFocus();
    else onBlur();
  }

  function handleSelect(country: Country | undefined) {
    onChange(country);
    setOpen(false);
    setSearch("");
    onBlur();
  }

  function handleSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
    if (e.key === "Enter" && filtered.length > 0) {
      handleSelect(filtered[0].value);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      {/* Trigger button showing current flag */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className="flex h-full items-center gap-1 px-1 py-1 focus:outline-none disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value ? (
          <Flag country={value} countryName={selected?.label ?? ""} className="h-4 w-6 rounded-sm object-cover" />
        ) : (
          <GlobeIcon />
        )}
        <ChevronIcon open={open} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-[var(--line)] p-2">
            <div className="flex items-center gap-2 rounded-md border border-[var(--line)] px-2 py-1.5 focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand-soft)]">
              <SearchIcon />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
                placeholder="Search country..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <ClearIcon />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <ul
            role="listbox"
            className="max-h-52 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--muted)]">No countries found</li>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li key={opt.value ?? "intl"} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-slate-50 ${
                        isSelected ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-[var(--ink)]"
                      }`}
                    >
                      {opt.value ? (
                        <Flag country={opt.value} countryName={opt.label} className="h-4 w-6 flex-shrink-0 rounded-sm object-cover" />
                      ) : (
                        <GlobeIcon />
                      )}
                      <span className="flex-1 truncate text-left">{opt.label}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Icon helpers ─────────────────────────────────────────────────────────────
function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m-9 9h18" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

// ── Public PhoneField component ───────────────────────────────────────────────
export function PhoneField({
  value,
  onChange,
  defaultCountry = "US",
  placeholder = "Phone number",
  disabled,
}: {
  value: PhoneValue | undefined;
  onChange: (value: PhoneValue | undefined) => void;
  defaultCountry?: Country;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="phone-input-wrapper">
      <PhoneInput
        international
        defaultCountry={defaultCountry}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        countrySelectComponent={SearchableCountrySelect as ComponentType<object>}
      />
    </div>
  );
}
