import ReadObjectRoute from './read';

export default class GetObjectRoute extends ReadObjectRoute {
  start() {
    this._server
      .router()
      .get(
        '/' + this._config.name + '/:oid',
        (rq, rs, n) => this._validatePath(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._authorizeUser(rq, rs, n),
        (rq, rs, n) => this._selectObject(rq, rs, n),
        (rq, rs, n) => this._subscribeRequest(rq, rs, n)
      );

    if (this._subscribe === true) {
      this._bindPubsub();
    }
  }

  _selectObject(request, response, next) {
    const id = request.param('oid');

    const query = this._format
      .format('select')
      .object(this._config.name);

    const prefix = [
      this._config.name,
      id
    ].join(':');

    const values = [id];

    const qo = this._server
      .database()
      .connection(this._config.database)
      .query(query);

    if (this._cache === true) {
      qo.prefix(prefix);
    }

    qo.execute(values, (error, result) => {
      if (error) {
        next(request.error('500 invalid_query ' + error));
        return;
      }

      result = this._applyFilter(result[0]);

      const ended = this._handleEtag(request, response,
        result, this._etag);

      if (ended === true) {
        next();
        return;
      }

      response.status(200);

      const write =
        Number(request.header('x-more')) === 1 &&
        this._subscribe === true;

      if (write === true) {
        response.write(result);
      } else {
        response.end(result);
      }

      next();
    });
  }

  _handleEtag(request, response, object, field) {
    if (field === false) {
      return false;
    }

    const cancel =
      this._etag === false ||
      typeof object[field] === 'undefined';

    if (cancel === true) {
      return false;
    }

    response.header('Etag', object[field]);

    if (request.header('If-None-Match') === object[field]) {
      response
        .status(304)
        .end();

      return true;
    }

    delete object[field];
    return false;
  }

  _handlePubsub(event) {
    this._server
      .cache()
      .invalidate(this._config.name + ':' + event.oid);

    this._server
      .pubsub()
      .fanout('/' + this._config.name + '/' + event.oid)
      .publish(event);
  }
}
