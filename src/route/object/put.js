import shortid from 'shortid';
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
    const data = this._applyFilter(request.data());

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
