import clsx from 'clsx';

const SKIN = ['#E8B896', '#D9A47E', '#C98F68', '#B97A52'];
const HAIR = ['#1B1B1B', '#2A1A12', '#3B2416', '#5A3A22'];

// Same name always gives the same look
const hash = (text = '') => [...String(text)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// The drawing. Extra props (x, y, width, height, className) go straight to the svg.
export function DoctorFigure({ gender, skin = SKIN[0], hair = HAIR[0], ...props }) {
  const female = gender === 'female';
  return (
    <svg viewBox="0 0 100 110" aria-hidden="true" focusable="false" {...props}>
      <path d="M12 110c0-24 16-38 38-38s38 14 38 38z" fill="#fff" />
      <path d="M38 74l12 20 12-20" fill="#E1F1F3" />
      <path d="M34 76c-4 10-2 20 6 22M66 76c4 10 2 20-6 22" stroke="#12303A" strokeWidth="2.5" fill="none" />
      <circle cx="40" cy="99" r="3.5" fill="#0B7285" />
      <rect x="43" y="64" width="14" height="12" rx="5" fill={skin} />
      {female && (
        <path d="M26 52c0-20 10-28 24-28s24 8 24 28c0 12-3 26-6 30-3-8-4-14-4-22H36c0 8-1 14-4 22-3-4-6-18-6-30z" fill={hair} />
      )}
      <ellipse cx="50" cy="50" rx="17" ry="20" fill={skin} />
      {female ? (
        <path d="M33 46c4-12 12-14 17-14s13 2 17 14c-6-5-12-6-17-6s-11 1-17 6z" fill={hair} />
      ) : (
        <path d="M32 46c-2-16 8-24 18-24s20 8 18 24c-3-6-6-10-10-11-6 3-16 3-20 0-3 2-5 6-6 11z" fill={hair} />
      )}
      <circle cx="44" cy="52" r="1.8" fill="#12303A" />
      <circle cx="56" cy="52" r="1.8" fill="#12303A" />
      <path d="M44 60c3 3 9 3 12 0" stroke="#12303A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M62 84h6M65 81v6" stroke="#D62839" strokeWidth="2.5" />
    </svg>
  );
}

export default function DoctorAvatar({ name = '', gender, photo, size = 56, shape = 'circle', className = '' }) {
  const h = hash(name);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >>> 3) % HAIR.length];

  if (photo) {
    const px = shape === 'bust' ? Math.min(size, 96) : size;
    return (
      <img
        src={photo}
        alt={name ? `Photo of ${name}` : ''}
        loading="lazy"
        className={clsx('shrink-0 rounded-full border-2 border-white object-cover', className)}
        style={{ width: px, height: px }}
      />
    );
  }

  if (shape === 'bust') {
    return (
      <DoctorFigure
        gender={gender}
        skin={skin}
        hair={hair}
        className={clsx('shrink-0', className)}
        style={{ height: size, width: size * 0.91 }}
      />
    );
  }

  return (
    <span
      className={clsx('inline-flex shrink-0 overflow-hidden rounded-full bg-soft', className)}
      style={{ width: size, height: size }}
    >
      <DoctorFigure gender={gender} skin={skin} hair={hair} preserveAspectRatio="xMidYMax slice" className="h-full w-full" />
    </span>
  );
}