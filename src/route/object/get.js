import ReadObjectRoute from './read';

export default class GetObjectRoute extends ReadObjectRoute {
  start() {
    this._server
      .router()
      .get(
        '/' + this._config.name + '/:oid',
        ...this._handlers({
          validate: [
            (rq, rs, n) => this._validatePath(rq, rs, n)
          ],
          authorize: [
            (rq, rs, n) => this._checkUser(rq, rs, n),
            (rq, rs, n) => this._authorizeRole(rq, rs, n),
            (rq, rs, n) => this._authorizeUser(rq, rs, n)
          ],
          execute: [
            (rq, rs, n) => this._selectObject(rq, rs, n)
          ],
          subscribe: [
            (rq, rs, n) => this._subscribeRequest(rq, rs, n)
          ]
        })
      );
  }

  _selectObject(request, response, next) {
    const id = request.param('oid');

    const [query, values] = this._format
      .format('select')
      .object(this._config.name, id);

    const qo = this._server
      .database()
      .connection(this._config.database)
      .query(query);

    if (this._cache === true) {
      qo.prefix([
        this._config.name,
        id
      ].join(':'));
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
    this._server
      .cache()
      .invalidate(this._config.name + ':' + event.oid);

    this._server
      .pubsub()
      .fanout('/' + this._config.name + '/' + event.oid)
      .publish(event);
  }
}
