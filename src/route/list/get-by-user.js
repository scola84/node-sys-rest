import GetListRoute from './get';

export default class GetListByUserRoute extends GetListRoute {
  start() {
    this._server
      .router()
      .get(
        '/user/' + this._config.name,
        (rq, rs, n) => this._validateQuery(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._prepareSelect(rq, rs, n),
        (rq, rs, n) => this._selectTotal(rq, rs, n),
        (rq, rs, n) => this._selectList(rq, rs, n)
      );
  }

  _authorizeRole(request, response, next) {
    const user = request.connection().user();

    if (user.may(this._config.name + '.read') === false) {
      next(request.error('403 invalid_auth'));
      return;
    }

    next();
  }

  _prepareSelect(request, response, next) {
    const path = [this._config.name, 'user'];

    if (this._config.children.indexOf('user') > -1) {
      path.reverse();
    }

    request.datum('path', path);
    request.datum('values', [request.uid()]);

    next();
  }
}
