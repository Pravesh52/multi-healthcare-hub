export const getStatus = (err) => err?.response?.status;

export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (!err) return fallback;
  if (err.code === 'ERR_NETWORK' || (!err.response && err.request)) {
    return 'Cannot reach the server. Please check your internet connection and try again.';
  }
  const message = err.response?.data?.message;
  return typeof message === 'string' && message ? message : fallback;
};

// Turns the server's validation details into { fieldName: 'message' } for form fields
export const getFieldErrors = (err) => {
  const details = err?.response?.data?.details;
  if (!Array.isArray(details)) return {};
  return details.reduce((acc, d) => {
    const key = String(d?.field || '').replace(/^(body|query|params)\./, '');
    if (key && !acc[key]) acc[key] = d.message;
    return acc;
  }, {});
};

// A new patient: the login page then asks for name, age and gender
export const isSignupRequired = (err) =>
  err?.response?.status === 422 && err.response.data?.details?.code === 'SIGNUP_REQUIRED';