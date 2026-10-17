import { SUPPORT_PHONE } from '@/utils/constants.js';

export default function TopBar() {
  return (
    <div className="no-print bg-[#B91C2C] pt-safe text-sm text-white">
      <div className="container-page flex flex-wrap items-center justify-center gap-x-6 gap-y-0.5 py-1.5 sm:justify-between">
        <p>
          Emergency? Call Ambulance{' '}
          <a href="tel:108" className="font-bold underline underline-offset-2">
            108
          </a>{' '}
          or Police{' '}
          <a href="tel:112" className="font-bold underline underline-offset-2">
            112
          </a>
        </p>
        {SUPPORT_PHONE && (
          <p>
            Helpline:{' '}
            <a href={`tel:${SUPPORT_PHONE}`} className="font-bold underline underline-offset-2">
              {SUPPORT_PHONE}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}