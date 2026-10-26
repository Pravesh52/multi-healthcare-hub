import { useEffect } from 'react';
import VerifyTable from '@/components/admin/VerifyTable.jsx';
import { APP_NAME } from '@/utils/constants.js';

export default function VerifyClinics() {
  useEffect(() => {
    document.title = `Clinics - Admin - ${APP_NAME}`;
  }, []);
  return <VerifyTable key="clinics" kind="clinics" />;
}