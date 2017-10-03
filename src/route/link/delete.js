import WriteLinkRoute from './write';

export default class DeleteLinkRoute extends WriteLinkRoute {
  start() {
    this._server
      .router()
      .delete(
        '/' + this._config.name + '/:oid/:child/:cid',
        (rq, rs, n) => this._validatePath(rq, rs, n),
        (rq, rs, n) => this._checkUser(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._authorizeUserObject(rq, rs, n),
        (rq, rs, n) => this._authorizeUserChild(rq, rs, n),
        (rq, rs, n) => this._deleteLink(rq, rs, n),
        (rq, rs, n) => this._publishLink(rq, rs, n)
      );
  }

  _deleteLink(request, response, next) {
    const child = request.param('child');

    if (this._config.simple.indexOf(child) > -1) {
      this._deleteSimple(request, response, next);
      return;
    }

    this._deleteComplex(request, response, next);
  }

  _deleteSimple(request, response, next) {
    const params = request.params();
    const child = request.param('child');

    const path = [
      this._config.name,
      child
    ];

    const etag = request.header('If-Match');

    console.log(etag, path, params);

    const [query, values] = this._format
      .format('delete')
      .simple(path, params, this._etag, etag);

    this._delete(query, values, etag, request, response, next);
  }

  _deleteComplex(request, response, next) {
    const params = request.params();
    const child = request.param('child');

    const path = [
      this._config.name,
      child
    ];

    const [query, values] = this._format
      .format('delete')
      .complex(path, params);

    this._delete(query, values, null, request, response, next);
  }

  _delete(query, values, etag, request, response, next) {
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
          .end();

        next();
      });
  }

  _publishLink(request) {
    if (this._publish === false) {
      return;
    }

    this._server
      .pubsub()
      .client()
      .publish(this._rest.config('pubsub.path'), {
        event: this._config.name,
        data: {
          child: request.param('child'),
          cid: request.param('cid'),
          method: request.method(),
          oid: request.param('oid')
        }
      });
  }
}
