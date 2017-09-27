import WriteLinkRoute from './write';

export default class PutLinkRoute extends WriteLinkRoute {
  start() {
    this._server
      .router()
      .put(
        '/' + this._config.name + '/:oid/:child/:cid',
        (rq, rs, n) => this._validatePath(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._authorizeUserObject(rq, rs, n),
        (rq, rs, n) => this._authorizeUserChild(rq, rs, n),
        (rq, rs, n) => this._update(rq, rs, n)
      );
  }

  _update(request, response, next) {
    const params = request.params();
    const child = request.param('child');

    const path = [
      this._config.name,
      child
    ];

    const query = this._format
      .format('update')
      .link(path);

    const link = {
      [this._config.name + '_id']: params.oid,
      [child + '_id']: params.cid
    };

    const values = this._filter({
      [this._config.name + '_id']: params.oid,
      [child + '_id']: params.cid
    });

    this._server
      .database()
      .connection(this._config.database)
      .query(query)
      .execute([values, link], (error) => {
        if (error) {
          console.log(error.sql);
          next(request.error('500 invalid_query ' + error));
          return;
        }

        response
          .status(200)
          .end();
      });
  }
}
