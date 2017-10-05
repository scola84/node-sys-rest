import PutLinkRoute from './put';

export default class PatchLinkRoute extends PutLinkRoute {
  start() {
    this._server
      .router()
      .patch(
        '/' + this._config.name + '/:oid/:child/:cid',
        ...this._handlers({
          validate: [
            (rq, rs, n) => this._validatePath(rq, rs, n),
            (rq, rs, n) => this._validateData(rq, rs, n)
          ],
          authorize: [
            (rq, rs, n) => this._checkUser(rq, rs, n),
            (rq, rs, n) => this._authorizeRole(rq, rs, n),
            (rq, rs, n) => this._authorizeUserObject(rq, rs, n),
            (rq, rs, n) => this._authorizeUserChild(rq, rs, n)
          ],
          execute: [
            (rq, rs, n) => this._updateLink(rq, rs, n)
          ],
          publish: [
            (rq, rs, n) => this._publishLink(rq, rs, n)
          ]
        })
      )
      .extract();
  }

  _validatePath(request, response, next) {
    const child = request.param('child');

    if (this._config.complex.indexOf(child) > -1 === true) {
      request.allow('PATCH', false);
      next(request.error('405 invalid_method'));
      return;
    }

    if (this._config.simple.indexOf(child) > -1 === false) {
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
