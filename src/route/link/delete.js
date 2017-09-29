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
        (rq, rs, n) => this._deleteLink(rq, rs, n),
        (rq, rs, n) => this._publishLink(rq, rs, n)
      );
  }

  _deleteLink(request, response, next) {
    const params = request.params();
    const child = request.param('child');

    const path = [
      this._config.name,
      child
    ];

    const type = this._config.simple.indexOf(child) > -1 ?
      'simple' : 'complex';

    const query = this._format
      .format('delete')
      .link(path, type);

    const values = [
      params.oid,
      params.cid
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
          method: 'DELETE',
          oid: request.param('oid'),
          uid: request.uid()
        }
      });
  }
}
