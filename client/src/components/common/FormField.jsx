import { forwardRef, useId } from 'react';
import clsx from 'clsx';

const describedBy = (id, error, hint) => (error ? `${id}-err` : hint ? `${id}-hint` : undefined);

export default function FormField({ label, htmlFor, error, hint, required = false, className = '', children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && (
            <span className="ml-0.5 text-bad" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={htmlFor ? `${htmlFor}-err` : undefined} role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { label, error, hint, required, className, inputClassName, id, type = 'text', ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <FormField label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <input
        ref={ref}
        id={inputId}
        type={type}
        className={clsx('input', error && 'border-bad', inputClassName)}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy(inputId, error, hint)}
        {...rest}
      />
    </FormField>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, required, className, inputClassName, id, children, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <FormField label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <select
        ref={ref}
        id={inputId}
        className={clsx('input', error && 'border-bad', inputClassName)}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy(inputId, error, hint)}
        {...rest}
      >
        {children}
      </select>
    </FormField>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, required, className, inputClassName, id, rows = 3, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <FormField label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={clsx('input resize-y', error && 'border-bad', inputClassName)}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy(inputId, error, hint)}
        {...rest}
      />
    </FormField>
  );
});