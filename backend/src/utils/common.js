const Common = {};

Common.requestFieldsValidation = async (fields, postdata) => {
  for (const field of fields) {
    if (typeof postdata[field] === 'undefined' || postdata[field] === '' || postdata[field] === null) {
      return { status: false, message: `${field} is required.` };
    }
  }
  return { status: true };
};

Common.getShortName = (name = '') => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

Common.generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

Common.paginate = (query = {}, page = 1, limit = 10) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  return { ...query, skip, limit: parseInt(limit) };
};

module.exports = Common;
