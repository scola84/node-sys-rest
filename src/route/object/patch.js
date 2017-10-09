import PutObjectRoute from './put';

export default class PatchObjectRoute extends PutObjectRoute {
  start() {
    this._handler([
      (rq, rs, n) => this._validatePath(rq, rs, n)
    ], this._validate);

    this._handler([
      (rq, rs, n) => this._authenticateUser(rq, rs, n),
      (rq, rs, n) => this._authorizeRole(rq, rs, n),
      (rq, rs, n) => this._authorizeUser(rq, rs, n)
    ], this._authorize);

    this._handler([
      (rq, rs, n) => this._extractData(rq, rs, n),
      (rq, rs, n) => this._transformData(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._validateData(rq, rs, n)
    ], this._validate);

    this._handler([
      (rq, rs, n) => this._updateObject(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._publishObject(rq, rs, n)
    ], this._publish);

    this._patch('/' + this._config.name + '/:oid');
  }

  _validateData(request, response, next) {
    if (this._validator === null) {
      next();
      return;
    }

    this._validator.validate(request.data(), {
      required: false
    }, next);
  }
}
