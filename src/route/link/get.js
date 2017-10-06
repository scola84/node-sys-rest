import LinkRoute from './route';

export default class GetLinkRoute extends LinkRoute {
  start() {
    this._server
      .router()
      .get(
        '/' + this._config.name + '/:oid/:child/:cid',
        ...this._handlers({
          validate: [
            (rq, rs, n) => this._validatePath(rq, rs, n)
          ],
          authorize: [
            (rq, rs, n) => this._checkUser(rq, rs, n),
            (rq, rs, n) => this._authorizeRole(rq, rs, n),
            (rq, rs, n) => this._authorizeUserObject(rq, rs, n),
            (rq, rs, n) => this._authorizeUserChild(rq, rs, n)
          ],
          execute: [
            (rq, rs, n) => this._selectLink(rq, rs, n)
          ],
          subscribe: [
            (rq, rs, n) => this._subscribeRequest(rq, rs, n)
          ]
        })
      );
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

      data = this._applyFilter({
        data: data[0]
      });

      let status = 200;

      const write =
        request.header('Connection') === 'keep-alive' &&
        this._subscribe === true;

      const match = this._handleEtag(request, response,
        data.data, this._etag);

      if (match === true) {
        status = 304;
        data = '';
      }

      response.status(status);

      if (request.method() === 'HEAD') {
        response.encoder().option('push', false);
      }

      if (write === true) {
        response.write(data);
      } else {
        response.end(data);
      }

      next();
    });
  }

  _handleEtag(request, response, data, field) {
    if (field === false) {
      return false;
    }

    const cancel =
      this._etag === false ||
      typeof data[field] === 'undefined';

    if (cancel === true) {
      return false;
    }

    response.header('Etag', data[field]);

    if (request.header('If-None-Match') === data[field]) {
      return true;
    }

    delete data[field];
    return false;
  }

  _handlePubsub(event) {
    const cancel =
      typeof event.meta.oid === 'undefined' ||
      typeof event.meta.child === 'undefined' ||
      typeof event.meta.cid === 'undefined';

    if (cancel === true) {
      return;
    }

    const path = [
      '',
      this._config.name,
      event.meta.oid,
      event.meta.child,
      event.meta.cid
    ].join('/');

    this._server
      .cache()
      .invalidate(path);

    this._server
      .pubsub()
      .fanout(path)
      .publish(event);
  }
}
