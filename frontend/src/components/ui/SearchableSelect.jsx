import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export default function SearchableSelect({
  id,
  value = '',
  onChange,
  options = [],
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search...',
  searchable = true,
  className = '',
  onBlur,
  showIcons = true,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const normalizedOptions = useMemo(() => options.map((option) => (
    typeof option === 'string'
      ? { value: option, label: option }
      : { value: String(option.value), label: option.label }
  )), [options]);
  const selectedOption = normalizedOptions.find((option) => option.value === String(value ?? ''));
  const filteredOptions = normalizedOptions.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    if (searchable) searchRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, searchable]);

  const selectOption = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setQuery('');
  };

  const toggleOpen = () => {
    setQuery('');
    setIsOpen((open) => !open);
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) onBlur?.(event);
      }}
    >
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={ariaInvalid}
        onClick={toggleOpen}
        style={{ color: selectedOption ? '#0f172a' : '#94a3b8', fontWeight: selectedOption ? 500 : 400 }}
        className={`${className} flex items-center justify-between gap-2 text-left ${selectedOption ? 'font-medium text-slate-900' : 'font-normal text-slate-400'}`}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        {showIcons && <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />}
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {searchable && (
            <div className="border-b border-slate-100 p-2">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10">
                {showIcons && <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                  className="w-full bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-0 shadow-none text-sm text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}
          <ul role="listbox" aria-label={ariaLabel || placeholder} className="max-h-[min(60vh,24rem)] overflow-y-auto p-1">
            {filteredOptions.length ? filteredOptions.map((option) => (
              <li key={option.value} role="option" aria-selected={option.value === String(value ?? '')}>
                <button
                  type="button"
                  onClick={() => selectOption(option)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-blue-50 ${option.value === String(value ?? '') ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700'}`}
                >
                  <span>{option.label}</span>
                  {showIcons && option.value === String(value ?? '') && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            )) : (
              <li className="px-3 py-3 text-sm text-slate-500">No matching options.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
