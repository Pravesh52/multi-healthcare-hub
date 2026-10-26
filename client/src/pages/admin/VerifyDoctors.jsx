import { useEffect } from 'react';
import VerifyTable from '@/components/admin/VerifyTable.jsx';
import { APP_NAME } from '@/utils/constants.js';

export default function VerifyDoctors() {
  useEffect(() => {
    document.title = `Doctors - Admin - ${APP_NAME}`;
  }, []);
  return <VerifyTable key="doctors" kind="doctors" />;
}