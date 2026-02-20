import { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

/**
 * CellInput — isolated controlled input for table cells.
 * Maintains its own local value via ref to avoid parent re-render focus loss.
 * Calls onChange (debounced externally) only on actual value change.
 */
interface CellInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
}

export function CellInput({ value, onChange, placeholder = '0', className, readOnly, autoFocus }: CellInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const localValue = useRef(value);

  // Sync from parent only if input is NOT focused (external programmatic updates)
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = value;
      localValue.current = value;
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    localValue.current = e.target.value;
    onChange(e.target.value);
  }, [onChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      defaultValue={value}
      onChange={handleChange}
      placeholder={placeholder}
      readOnly={readOnly}
      autoFocus={autoFocus}
      className={cn(
        'w-full text-center bg-transparent border border-transparent rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary/50 hover:border-border/50 transition-colors',
        className,
      )}
    />
  );
}
