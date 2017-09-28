import WriteLinkRoute from './write';

export default class PutLinkRoute extends WriteLinkRoute {
  start() {
    this._server
      .router()
      .put(
        '/' + this._config.name + '/:oid/:child/:cid',
        (rq, rs, n) => this._validatePath(rq, rs, n),
        (rq, rs, n) => this._validateData(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._authorizeUserObject(rq, rs, n),
        (rq, rs, n) => this._authorizeUserChild(rq, rs, n),
        (rq, rs, n) => this._update(rq, rs, n)
      )
      .extract();
  }

  _validateData(request, response, next) {
    next();
  }

  _update(request, response, next) {
    const params = request.params();
    const child = request.param('child');

    const path = [
      this._config.name,
      child
    ];

    const type = this._config.simple.indexOf(child) > -1 ?
      'simple' : 'complex';

    const query = this._format
      .format('update')
      .link(path, type);

    let data = {
      [this._config.name + '_id']: params.oid,
      [child + '_id']: params.cid
    };

    if (type === 'simple') {
      data = Object.assign({}, request.data(), data);
    }

    const values = this._filter(data);

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
