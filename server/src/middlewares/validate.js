// Usage: router.post('/path', validate(schema), controller)
// schema = z.object({ body: z.object({...}), query: ..., params: ... })
const validate = (schema) => (req, res, next) => {
  const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
  if (parsed.body) req.body = parsed.body;
  if (parsed.query) req.query = parsed.query;
  if (parsed.params) req.params = parsed.params;
  next();
};

export default validate;