const isValidEmail = (email: string): boolean => {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return true;
  return false;
};

export { isValidEmail };
