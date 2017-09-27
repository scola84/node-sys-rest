import WriteLinkRoute from './write';

export default class DeleteLinkRoute extends WriteLinkRoute {
  start() {
    this._server
      .router()
      .delete(
        '/' + this._config.name + '/:oid/:child/:cid',
        (rq, rs, n) => this._validatePath(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._authorizeUserObject(rq, rs, n),
        (rq, rs, n) => this._authorizeUserChild(rq, rs, n),
        (rq, rs, n) => this._delete(rq, rs, n)
      );
  }

  _delete(request, response, next) {
    const path = [
      this._config.name,
      request.param('child')
    ];

    const query = this._format
      .format('delete')
      .link(path);

    const values = [
      request.param('oid'),
      request.param('cid')
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
