import GetListRoute from './get';

export default class GetListByParentRoute extends GetListRoute {
  start() {
    this._server
      .router()
      .get(
        '/:parent/:id/' + this._config.name,
        (rq, rs, n) => this._validatePath(rq, rs, n),
        (rq, rs, n) => this._validateQuery(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._authorizeUser(rq, rs, n),
        (rq, rs, n) => this._selectTotal(rq, rs, n),
        (rq, rs, n) => this._selectList(rq, rs, n)
      );
  }

  _authorizeUser(request, response, next) {
    const uid = request.uid();
    const parent = request.param('parent');
    const parentId = Number(request.param('id'));
    const path = this._rest.structure('user.children');

    this._user(path, uid, (error, list) => {
      if (error) {
        next(error);
        return;
      }

      const ids = list[parent].filter((id) => {
        return id === parentId;
      });

      if (ids.length === 0) {
        next(request.error('403 invalid_auth'));
        return;
      }

      request.datum('path', this._rest.path(this._config.name));
      request.datum('values', [ids]);

      next();
    });
  }
}