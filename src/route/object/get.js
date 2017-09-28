import ReadObjectRoute from './read';

export default class GetObjectRoute extends ReadObjectRoute {
  start() {
    this._server
      .router()
      .get(
        '/' + this._config.name + '/:id',
        (rq, rs, n) => this._validatePath(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._authorizeUser(rq, rs, n),
        (rq, rs, n) => this._select(rq, rs, n)
      );
  }

  _select(request, response, next) {
    const id = request.param('id');

    const query = this._format
      .format('select')
      .object(this._config.name);

    const prefix = [
      this._config.name,
      id,
      'object'
    ].join(':');

    const values = [id];

    this._server
      .database()
      .connection(this._config.database)
      .query(query)
      .hash(this._config.hash)
      .prefix(prefix)
      .execute(values, (error, result, hash) => {
        if (error) {
          next(request.error('500 invalid_query ' + error));
          return;
        }

        if (request.header('Etag') === hash) {
          response
            .status(304)
            .header('Etag', hash)
            .end();

          return;
        }

        if (typeof hash === 'string') {
          response.header('Etag', hash);
        }

        response
          .status(200)
          .end(this._filter(result[0]));
      });
  }
}
