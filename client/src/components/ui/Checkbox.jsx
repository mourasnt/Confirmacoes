import { useEffect, useRef } from 'react';

export default function Checkbox({ checked, indeterminate = false, onChange, label, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-slate-100 ${className}`}
      onClick={(e) => e.stopPropagation()}
      title={label}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="peer sr-only"
      />
      <span
        className={`grid h-[18px] w-[18px] place-items-center rounded-[5px] border bg-white shadow-sm transition-colors duration-150 ${
          checked
            ? 'border-indigo-600 bg-indigo-600'
            : 'border-slate-300 peer-hover:border-indigo-400'
        } peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/40`}
        aria-hidden="true"
      >
        {indeterminate && !checked ? (
          <span className="h-[2px] w-[8px] rounded-full bg-indigo-600" />
        ) : (
          <svg
            viewBox="0 0 12 12"
            className={`h-3 w-3 text-white transition-opacity duration-150 ${
              checked ? 'opacity-100' : 'opacity-0'
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 6.5l2.5 2.5L9.5 3.5" />
          </svg>
        )}
      </span>
    </label>
  );
}
