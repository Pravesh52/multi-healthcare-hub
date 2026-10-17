const speciality = (name) => ({ label: name, to: `/search?speciality=${encodeURIComponent(name)}` });

export const FOOTER_SECTIONS = [
  {
    title: 'Find doctors',
    links: [
      'General Physician',
      'Pediatrician',
      'Gynaecologist',
      'Dentist',
      'Orthopedic',
      'Dermatologist',
      'Eye Specialist',
    ].map(speciality),
  },
  {
    title: 'Clinics and hospitals',
    links: [
      { label: 'Clinics', to: '/search?type=clinic' },
      { label: 'Hospitals', to: '/search?type=hospital' },
      { label: 'Pathology labs', to: '/search?type=lab' },
    ],
  },
  {
    title: 'For doctors',
    links: [
      { label: 'Doctor sign up', to: '/register/doctor' },
      { label: 'Doctor login', to: '/login?role=doctor' },
    ],
  },
  {
    title: 'For clinics and hospitals',
    links: [
      { label: 'Register your clinic', to: '/register/clinic' },
      { label: 'Clinic login', to: '/login?role=clinic' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Privacy policy', to: '/privacy' },
    ],
  },
];