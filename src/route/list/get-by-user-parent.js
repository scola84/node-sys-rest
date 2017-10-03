import GetListByUserRoute from './get-by-user';

export default class GetListByUserParentRoute extends GetListByUserRoute {
  constructor() {
    super();
    this._parents = new Set();
  }

  start() {
    this._server
      .router()
      .get(
        '/my/:parent/' + this._config.name,
        (rq, rs, n) => this._validatePath(rq, rs, n),
        (rq, rs, n) => this._validateQuery(rq, rs, n),
        (rq, rs, n) => this._checkUser(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._authorizeUser(rq, rs, n),
        (rq, rs, n) => this._prepareSelect(rq, rs, n),
        (rq, rs, n) => this._selectTotal(rq, rs, n),
        (rq, rs, n) => this._selectList(rq, rs, n),
        (rq, rs, n) => this._subscribeRequest(rq, rs, n)
      );

    if (this._subscribe === true) {
      this._bindPubsub();
    }
  }

  _authorizeUser(request, response, next) {
    const uid = request.uid();
    const parent = request.param('parent');
    const path = this._rest.structure('user.complex');

    this._buildUserAuth(path, uid, (error, list) => {
      if (error) {
        next(error);
        return;
      }

      if (list[parent].length === 0) {
        next(request.error('403 invalid_auth'));
        return;
      }

      request.datum('values', [list[parent]]);
      next();
    });
  }

  _prepareSelect(request, response, next) {
    this._parents.add(request.param('parent'));
    request.datum('path', this._rest.path(this._config.name));
    next();
  }

  _handlePubsub(event) {
    this._server
      .cache()
      .invalidate(this._config.name);

    this._parents.forEach((parent) => {
      const channel = '/' + [
        'my',
        parent,
        this._config.name
      ].join('/');

      this._server
        .pubsub()
        .fanout(channel)
        .publish(event);
    });
  }
}
