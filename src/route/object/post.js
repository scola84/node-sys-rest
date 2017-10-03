import WriteObjectRoute from './write';

export default class PostObjectRoute extends WriteObjectRoute {
  start() {
    this._server
      .router()
      .post(
        '/' + this._config.name,
        (rq, rs, n) => this._validateData(rq, rs, n),
        (rq, rs, n) => this._checkUser(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._insertObject(rq, rs, n),
        (rq, rs, n) => this._publishObject(rq, rs, n)
      )
      .extract();
  }

  _insertObject(request, response, next) {
    const query = this._format
      .format('insert')
      .object(this._config.name);

    const values = this._applyFilter(request.data());

    this._server
      .database()
      .connection(this._config.database)
      .query(query)
      .execute(values, (error, result) => {
        if (error) {
          next(request.error('500 invalid_query ' + error));
          return;
        }

        const oid = this._format
          .format('insert')
          .id(result);

        const location = [
          this._config.name,
          oid
        ].join('/');

        response
          .status(201)
          .header('Location', location)
          .datum('oid', oid)
          .end();

        next();
      });
  }

  _publishObject(request, response) {
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
          method: request.method(),
          oid: response.datum('oid')
        }
      });
  }
}
