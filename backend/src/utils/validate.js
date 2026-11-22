// zod şemalarıyla istek gövdesi / sorgu / parametre doğrulayan middleware.
// Doğrulanmış (ve tipleri dönüştürülmüş) değerler req.body / req.query / req.params'a yazılır.
const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) req.query = schemas.query.parse(req.query);
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = validate;
