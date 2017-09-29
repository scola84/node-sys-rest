import WriteObjectRoute from './write';

export default class PutObjectRoute extends WriteObjectRoute {
  start() {
    this._server
      .router()
      .put(
        '/' + this._config.name + '/:oid',
        (rq, rs, n) => this._validatePath(rq, rs, n),
        (rq, rs, n) => this._validateData(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._authorizeUser(rq, rs, n),
        (rq, rs, n) => this._updateObject(rq, rs, n),
        (rq, rs, n) => this._publishObject(rq, rs, n)
      )
      .extract();
  }

  _updateObject(request, response, next) {
    const query = this._format
      .format('update')
      .object(this._config.name);

    const values = [
      this._applyFilter(request.data()),
      request.param('oid')
    ];

    this._server
      .database()
      .connection(this._config.database)
      .query(query)
      .execute(values, (error) => {
        if (error) {
          next(request.error('500 invalid_query ' + error));
          return;
        }

        response
          .status(200)
          .end();

        next();
      });
  }

  _publishObject(request) {
    if (this._publish === false) {
      return;
    }

    this._server
      .pubsub()
      .client()
      .publish(this._rest.config('pubsub.path'), {
        event: this._config.name,
        data: {
          data: request.data(),
          method: 'PUT',
          oid: request.param('oid'),
          uid: request.uid()
        }
      });
  }
}
