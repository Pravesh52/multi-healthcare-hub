import { useState } from 'react';
import { LocateFixed, Search } from 'lucide-react';
import Button from '@/components/common/Button.jsx';

export default function SearchBox({
  states = [],
  districts = [],
  state = '',
  district = '',
  onStateChange,
  onDistrictChange,
  onSearch,
  onNearMe,
  nearLoading = false,
  locationsLoading = false,
  locationsError = false,
}) {
  const [q, setQ] = useState('');

  const submit = (e) => {
    e.preventDefault();
    onSearch?.({ q: q.trim() });
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Find a doctor or clinic"
      className="grid max-w-xl gap-2 rounded-2xl bg-card p-3 text-ink shadow-pop sm:grid-cols-2"
    >
      <div>
        <label htmlFor="home-state" className="sr-only">
          State
        </label>
        <select
          id="home-state"
          className="input"
          value={state}
          onChange={(e) => onStateChange?.(e.target.value)}
          disabled={locationsLoading || !states.length}
        >
          {locationsLoading && <option>Loading states...</option>}
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="home-district" className="sr-only">
          District
        </label>
        <select
          id="home-district"
          className="input"
          value={district}
          onChange={(e) => onDistrictChange?.(e.target.value)}
          disabled={!state}
        >
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {locationsError && (
        <p role="alert" className="field-error sm:col-span-2">
          Could not load the list of states. Please check your internet connection.
        </p>
      )}

      <div className="sm:col-span-2">
        <label htmlFor="home-q" className="sr-only">
          Doctor, clinic or speciality
        </label>
        <input
          id="home-q"
          type="text"
          enterKeyHint="search"
          className="input"
          placeholder="Search doctor, clinic or speciality"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={60}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:col-span-2">
        <Button type="submit" icon={Search}>
          Search
        </Button>
        <Button variant="outline" icon={LocateFixed} loading={nearLoading} onClick={onNearMe}>
          Near me
        </Button>
      </div>
    </form>
  );
}