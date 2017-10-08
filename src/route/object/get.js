import ObjectRoute from './route';

export default class GetObjectRoute extends ObjectRoute {
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
            (rq, rs, n) => this._selectObject(rq, rs, n),
            (rq, rs, n) => this._sendResponse(rq, rs, n)
          ],
          subscribe: [
            (rq, rs, n) => this._subscribeRequest(rq, rs, n)
          ]
        })
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
        '',
        this._config.name,
        id
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

      response.data(this._applyFilter({
        data: data[0]
      }));

      next();
    });
  }

  _handlePubsub(event) {
    const cancel =
      typeof event.meta.oid === 'undefined' ||
      typeof event.meta.child !== 'undefined';

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
        event.meta.oid
      ].join('/'));
  }

  _publishChange(event) {
    this._server
      .pubsub()
      .fanout([
        '',
        this._config.name,
        event.meta.oid
      ].join('/'))
      .publish(event);
  }
}
