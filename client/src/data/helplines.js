import { SUPPORT_PHONE } from '@/utils/constants.js';

// "icon" is the name of the drawing the component shows for it
export const HELPLINES = [
  { key: 'ambulance', number: '108', title: 'Ambulance', note: 'Medical emergency', icon: 'ambulance' },
  { key: 'police', number: '112', title: 'Police / Emergency', note: 'Any emergency', icon: 'police' },
  { key: 'child', number: '1098', title: 'Child Helpline', note: 'Help for a child in trouble', icon: 'child' },
  { key: 'women', number: '181', title: 'Women Helpline', note: 'Help for women', icon: 'women' },
  { key: 'health', number: '104', title: 'Health Helpline', note: 'Health advice', icon: 'health' },
];

export const getHelplines = () =>
  SUPPORT_PHONE
    ? [...HELPLINES, { key: 'support', number: SUPPORT_PHONE, title: 'Support', note: 'Call our team', icon: 'support' }]
    : HELPLINES;