import { useEffect } from 'react';
import Button from '@/components/common/Button.jsx';
import { APP_NAME } from '@/utils/constants.js';

export default function NotFound() {
  useEffect(() => {
    document.title = `Page not found - ${APP_NAME}`;
  }, []);

  return (
    <div className="container-page flex min-h-[55vh] flex-col items-center justify-center py-12 text-center">
      <p className="text-7xl font-bold text-brand sm:text-8xl">404</p>
      <h1 className="mt-2 text-2xl font-bold">We could not find this page</h1>
      <p className="mt-2 max-w-md text-muted">
        The link may be wrong or the page may have moved. You can go back to the home page or search for a doctor.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button to="/">Go to home</Button>
        <Button to="/search" variant="outline">
          Find a doctor
        </Button>
      </div>
    </div>
  );
}