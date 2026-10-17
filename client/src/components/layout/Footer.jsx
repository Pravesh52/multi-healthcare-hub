import { Link } from 'react-router-dom';
import Logo from '@/components/common/Logo.jsx';
import { FOOTER_SECTIONS } from '@/data/footerLinks.js';
import { APP_NAME } from '@/utils/constants.js';

export default function Footer() {
  return (
    <footer className="no-print bg-foot pb-safe text-foot-ink">
      <div className="container-page py-10">
        <div className="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-12">
          <div className="mb-8 lg:mb-0">
            <Logo light />
            <p className="mt-3 max-w-xs text-sm">
              Find doctors and clinics near you, book an appointment and follow your live queue.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="mb-2 text-base font-bold text-white">{section.title}</h3>
                <ul>
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.to} className="inline-block py-1.5 text-sm hover:text-white hover:underline">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-4 text-xs sm:flex-row sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p>This platform does not replace a doctor&apos;s advice. In an emergency, call 108.</p>
        </div>
      </div>
    </footer>
  );
}