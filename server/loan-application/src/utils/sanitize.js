const stripTags = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/<[^>]*>/g, '').trim();
};

export const sanitizeInput = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeInput(item));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, nestedValue]) => {
      acc[key] = sanitizeInput(nestedValue);
      return acc;
    }, {});
  }

  if (typeof value === 'string') {
    return stripTags(value);
  }

  return value;
};

export const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return stripTags(value).trim();
};
