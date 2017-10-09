import shortid from 'shortid';
import WriteObjectRoute from './write';

export default class PutObjectRoute extends WriteObjectRoute {
  start() {
    this._handler([
      (rq, rs, n) => this._validatePath(rq, rs, n)
    ], this._validate);

    this._handler([
      (rq, rs, n) => this._authenticateUser(rq, rs, n),
      (rq, rs, n) => this._authorizeRole(rq, rs, n),
      (rq, rs, n) => this._authorizeUser(rq, rs, n)
    ], this._authorize);

    this._handler([
      (rq, rs, n) => this._extractData(rq, rs, n),
      (rq, rs, n) => this._transformData(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._validateData(rq, rs, n)
    ], this._validate);

    this._handler([
      (rq, rs, n) => this._updateObject(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._publishObject(rq, rs, n)
    ], this._publish);

    this._put('/' + this._config.name + '/:oid');
  }

  _updateObject(request, response, next) {
    const data = request.data();

    if (this._etag) {
      data[this._etag] = '"' + shortid.generate() + '"';
    }

    const etag = request.header('If-Match');

    const [query, values] = this._format
      .format('update')
      .object(this._config.name, data,
        request.param('oid'), this._etag, etag);

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
          .format('update')
          .changed(result);

        if (changed === false) {
          if (etag === null) {
            next(request.error('404 invalid_path'));
            return;
          }

          next(request.error('412 invalid_version'));
          return;
        }

        if (this._etag) {
          delete data[this._etag];
        }

        request.data(data);

        response
          .status(200)
          .datum('oid', request.param('oid'))
          .end();

        next();
      });
  }
}
