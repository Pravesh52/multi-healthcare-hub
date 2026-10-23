import { useEffect, useId, useMemo, useState } from 'react';
import { FileText, ImagePlus, X } from 'lucide-react';
import clsx from 'clsx';

const MAX_MB = 5;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Some browsers leave the type empty, so the file extension is checked too
const typeOf = (file) => {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' }[ext] || '';
};

const sizeText = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export default function FileInput({
  label,
  hint,
  required = false,
  allowPdf = false,
  multiple = false,
  maxFiles = 1,
  files = [],
  onChange,
  error,
  className = '',
}) {
  const id = useId();
  const [localError, setLocalError] = useState('');

  const allowed = allowPdf ? [...IMAGE_TYPES, 'application/pdf'] : IMAGE_TYPES;
  const accept = allowed.join(',');

  const previews = useMemo(() => files.map((f) => (typeOf(f).startsWith('image/') ? URL.createObjectURL(f) : null)), [files]);
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

  const canAdd = multiple ? files.length < maxFiles : files.length === 0;
  const shownError = error || localError;

  const onPick = (e) => {
    const picked = [...(e.target.files || [])];
    e.target.value = ''; // so the same file can be chosen again
    if (!picked.length) return;

    let problem = '';
    const good = picked.filter((f) => {
      if (!allowed.includes(typeOf(f))) {
        problem = allowPdf ? `"${f.name}" must be a JPG, PNG, WEBP or PDF file` : `"${f.name}" must be a JPG, PNG or WEBP image`;
        return false;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        problem = `"${f.name}" is larger than ${MAX_MB} MB`;
        return false;
      }
      return true;
    });

    if (multiple && files.length + good.length > maxFiles) problem = `You can add up to ${maxFiles} files`;
    setLocalError(problem);
    if (!good.length) return;
    onChange(multiple ? [...files, ...good].slice(0, maxFiles) : [good[0]]);
  };

  const remove = (index) => {
    setLocalError('');
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      <p className="label" id={`${id}-label`}>
        {label}
        {required && (
          <span className="ml-0.5 text-bad" aria-hidden="true">
            *
          </span>
        )}
      </p>

      {files.length > 0 && (
        <ul className="mb-2 space-y-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-line bg-page p-2">
              {previews[i] ? (
                <img src={previews[i]} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-soft text-brand">
                  <FileText size={26} aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{f.name}</p>
                <p className="text-xs text-muted">{sizeText(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${f.name}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-bad hover:bg-bad-soft"
              >
                <X size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <label
          htmlFor={id}
          className={clsx(
            'flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-center font-semibold text-brand transition-colors hover:bg-soft focus-within:ring-2 focus-within:ring-amber-500',
            shownError ? 'border-bad' : 'border-line'
          )}
        >
          <ImagePlus size={20} aria-hidden="true" />
          {files.length ? 'Add another file' : multiple ? 'Choose files' : 'Choose a file'}
          <input
            id={id}
            type="file"
            accept={accept}
            multiple={multiple}
            className="sr-only"
            onChange={onPick}
            aria-labelledby={`${id}-label`}
            aria-invalid={shownError ? true : undefined}
          />
        </label>
      )}

      {hint && !shownError && <p className="hint">{hint}</p>}
      {shownError && (
        <p role="alert" className="field-error">
          {shownError}
        </p>
      )}
    </div>
  );
}