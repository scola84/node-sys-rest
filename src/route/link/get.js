import LinkRoute from './route';

export default class GetLinkRoute extends LinkRoute {
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
      (rq, rs, n) => this._selectLink(rq, rs, n),
      (rq, rs, n) => this._transformData(rq, rs, n),
      (rq, rs, n) => this._sendResponse(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._subscribeRequest(rq, rs, n)
    ], this._publish);

    this._get('/' + this._config.name + '/:oid/:child/:cid');
  }

  _validatePath(request, response, next) {
    const child = request.param('child');

    if (this._config.complex.indexOf(child) > -1 === true) {
      request.allow(request.method(), false);
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

  _authorizeRole(request, response, next) {
    const user = request.connection().user();

    if (user.may(this._config.name + '.read') === false) {
      next(request.error('403 invalid_auth'));
      return;
    }

    next();
  }

  _selectLink(request, response, next) {
    const params = request.params();
    const child = request.param('child');

    const path = [
      this._config.name,
      child
    ];

    const [query, values] = this._format
      .format('select')
      .link(path, params.cid);

    const qo = this._server
      .database()
      .connection(this._config.database)
      .query(query);

    if (this._cache === true) {
      qo.prefix([
        '',
        this._config.name,
        params.oid,
        child,
        params.cid
      ].join('/'));
    }

    qo.execute(values, (error, data) => {
      if (error) {
        next(request.error('500 invalid_query ' + error));
        return;
      }

      if (data.length === 0) {
        next(request.error('404 invalid_path'));
        return;
      }

      response.data({
        data: data[0]
      });

      next();
    });
  }

  _handlePubsub(event) {
    const cancel =
      typeof event.meta.oid === 'undefined' ||
      typeof event.meta.child === 'undefined' ||
      typeof event.meta.cid === 'undefined';

    if (cancel === true) {
      return;
    }

    super._handlePubsub(event);
  }

  _invalidateCache(event) {
    this._server
      .cache()
      .invalidate([
        '',
        this._config.name,
        event.meta.oid,
        event.meta.child,
        event.meta.cid
      ].join('/'));
  }

  _publishChange(event) {
    this._server
      .pubsub()
      .fanout([
        '',
        this._config.name,
        event.meta.oid,
        event.meta.child,
        event.meta.cid
      ].join('/'))
      .publish(event);
  }
}
