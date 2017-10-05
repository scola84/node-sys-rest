import PutObjectRoute from './put';

export default class PatchObjectRoute extends PutObjectRoute {
  start() {
    this._server
      .router()
      .patch(
        '/' + this._config.name + '/:oid',
        ...this._handlers({
          validate: [
            (rq, rs, n) => this._validatePath(rq, rs, n),
            (rq, rs, n) => this._validateData(rq, rs, n)
          ],
          authorize: [
            (rq, rs, n) => this._checkUser(rq, rs, n),
            (rq, rs, n) => this._authorizeRole(rq, rs, n),
            (rq, rs, n) => this._authorizeUser(rq, rs, n)
          ],
          execute: [
            (rq, rs, n) => this._updateObject(rq, rs, n)
          ],
          publish: [
            (rq, rs, n) => this._publishObject(rq, rs, n)
          ]
        })
      )
      .extract();
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
