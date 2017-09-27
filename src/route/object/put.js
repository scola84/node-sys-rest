import WriteObjectRoute from './write';

export default class PutObjectRoute extends WriteObjectRoute {
  start() {
    this._server
      .router()
      .put(
        '/' + this._config.name + '/:id',
        (rq, rs, n) => this._validatePath(rq, rs, n),
        (rq, rs, n) => this._validateData(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._authorizeUser(rq, rs, n),
        (rq, rs, n) => this._update(rq, rs, n)
      )
      .extract();
  }

  _update(request, response, next) {
    const query = this._format
      .format('update')
      .object(this._config.name);

    const values = [
      this._filter(request.data()),
      request.param('id')
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
      });
  }
}
