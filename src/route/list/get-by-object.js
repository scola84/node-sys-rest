import GetListRoute from './get';

export default class GetListByObjectRoute extends GetListRoute {
  start() {
    this._server
      .router()
      .get(
        '/' + this._config.name + '/:oid/:child',
        ...this._handlers({
          validate: [
            (rq, rs, n) => this._validatePath(rq, rs, n),
            (rq, rs, n) => this._validateQuery(rq, rs, n)
          ],
          authorize: [
            (rq, rs, n) => this._checkUser(rq, rs, n),
            (rq, rs, n) => this._authorizeRole(rq, rs, n),
            (rq, rs, n) => this._authorizeUser(rq, rs, n)
          ],
          execute: [
            (rq, rs, n) => this._prepareSelect(rq, rs, n),
            (rq, rs, n) => this._selectTotal(rq, rs, n),
            (rq, rs, n) => this._selectList(rq, rs, n)
          ],
          subscribe: [
            (rq, rs, n) => this._subscribeRequest(rq, rs, n)
          ]
        })
      );
  }

  _validatePath(request, response, next) {
    const child = request.param('child');

    const isChild =
      this._config.complex.indexOf(child) > -1 ||
      this._config.simple.indexOf(child) > -1;

    if (isChild === false) {
      next(request.error('404 invalid_path'));
      return;
    }

    this._rest
      .validator()
      .validate(request.params(), next);
  }

  _authorizeRole(request, response, next) {
    const user = request.connection().user();

    if (user.may(this._config.name + '.read') === false) {
      next(request.error('403 invalid_auth'));
      return;
    }

    next();
  }

  _authorizeUser(request, response, next) {
    const user = request.connection().user();
    const name = this._config.name;
    const id = request.param('oid');

    this._authorizeRequest(user, name, id, (error) => {
      if (error) {
        next(request.error('403 invalid_auth'));
        return;
      }

      next();
    });
  }

  _prepareSelect(request, response, next) {
    const child = request.param('child');

    let path = [child, this._config.name];
    const values = [request.param('oid')];

    if (this._config.simple.indexOf(child) > -1) {
      path = [path.reverse().join('_'), null];
    }

    request.datum('path', path);
    request.datum('values', values);

    next();
  }

  _handlePubsub(event) {
    const channel = '/' + [
      this._config.name,
      event.oid,
      event.child
    ].join('/');

    this._server
      .cache()
      .invalidate(this._config.name);

    this._server
      .pubsub()
      .fanout(channel)
      .publish(event);
  }
}
