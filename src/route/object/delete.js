import WriteObjectRoute from './write';

export default class DeleteObjectRoute extends WriteObjectRoute {
  start() {
    this._handler([
      (rq, rs, n) => this._validatePath(rq, rs, n)
    ], this._validate);

    this._handler([
      (rq, rs, n) => this._checkUser(rq, rs, n),
      (rq, rs, n) => this._authorizeRole(rq, rs, n),
      (rq, rs, n) => this._authorizeUser(rq, rs, n)
    ], this._authorize);

    this._handler([
      (rq, rs, n) => this._deleteObject(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._publishObject(rq, rs, n)
    ], this._publish);

    this._delete('/' + this._config.name + '/:oid');
  }

  _deleteObject(request, response, next) {
    const etag = request.header('If-Match');

    const [query, values] = this._format
      .format('delete')
      .object(this._config.name, request.param('oid'),
        this._etag, etag);

    this._server
      .database()
      .connection(this._config.database)
      .query(query)
      .execute(values, (error, result) => {
        if (error) {
          next(request.error('500 invalid_query ' + error));
          return;
        }

        const changed = this._format
          .format('delete')
          .changed(result);

        if (changed === false) {
          if (etag === null) {
            next(request.error('404 invalid_path'));
            return;
          }

          next(request.error('412 invalid_version'));
          return;
        }

        response
          .status(200)
          .datum('oid', request.param('oid'))
          .end();

        next();
      });
  }
}
