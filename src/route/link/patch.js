import PutLinkRoute from './put';

export default class PatchLinkRoute extends PutLinkRoute {
  start() {
    this._handler([
      (rq, rs, n) => this._validatePath(rq, rs, n)
    ], this._validate);

    this._handler([
      (rq, rs, n) => this._authenticateUser(rq, rs, n),
      (rq, rs, n) => this._authorizeRole(rq, rs, n),
      (rq, rs, n) => this._authorizeUserObject(rq, rs, n),
      (rq, rs, n) => this._authorizeUserChild(rq, rs, n)
    ], this._authorize);

    this._handler([
      (rq, rs, n) => this._extractData(rq, rs, n),
      (rq, rs, n) => this._transformData(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._validateData(rq, rs, n)
    ], this._validate);

    this._handler([
      (rq, rs, n) => this._updateLink(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._publishLink(rq, rs, n)
    ], this._publish);

    this._patch('/' + this._config.name + '/:oid/:child/:cid');
  }

  _validatePath(request, response, next) {
    const child = request.param('child');

    if (this._config.complex.indexOf(child) > -1) {
      request.allow(request.method(), false);
      next(request.error('405 invalid_method'));
      return;
    }

    if (this._config.simple.indexOf(child) === -1) {
      next(request.error('404 invalid_path'));
      return;
    }

    this._rest
      .validator()
      .validate(request.params(), next);
  }

  _validateData(request, response, next) {
    const child = request.param('child');

    if (this._validator === null) {
      next();
      return;
    }

    const validator = this._validator[child];

    if (typeof validator === 'undefined') {
      next();
      return;
    }

    validator.validate(request.data(), {
      required: false
    }, next);
  }
}
