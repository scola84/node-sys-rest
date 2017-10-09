import WriteLinkRoute from './write';

export default class PostLinkRoute extends WriteLinkRoute {
  start() {
    this._handler([
      (rq, rs, n) => this._validatePath(rq, rs, n)
    ], this._validate);

    this._handler([
      (rq, rs, n) => this._checkUser(rq, rs, n),
      (rq, rs, n) => this._authorizeRole(rq, rs, n),
      (rq, rs, n) => this._authorizeUserObject(rq, rs, n)
    ], this._authorize);

    this._handler([
      (rq, rs, n) => this._extractData(rq, rs, n),
      (rq, rs, n) => this._transformData(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._validateData(rq, rs, n)
    ], this._validate);

    this._handler([
      (rq, rs, n) => this._insertLink(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._publishLink(rq, rs, n)
    ], this._publish);

    this._post('/' + this._config.name + '/:oid/:child');
  }

  _validatePath(request, response, next) {
    const child = request.param('child');

    if (this._config.simple.indexOf(child) === -1) {
      next(request.error('404 invalid_path'));
      return;
    }

    this._rest
      .validator()
      .validate(request.params(), next);
  }

  _insertLink(request, response, next) {
    const params = request.params();
    const child = request.param('child');

    const path = [
      this._config.name,
      child
    ];

    const query = this._format
      .format('insert')
      .link(path);

    const values = Object.assign({
      [this._config.name + '_id']: params.oid
    }, request.data());

    this._server
      .database()
      .connection(this._config.database)
      .query(query)
      .execute(values, (error, result) => {
        if (error) {
          next(request.error('500 invalid_query ' + error));
          return;
        }

        const cid = this._format
          .format('insert')
          .id(result);

        const location = [
          this._config.name,
          params.oid,
          child,
          cid
        ].join('/');

        request.data(values);

        response
          .status(201)
          .header('Location', location)
          .datum('cid', cid)
          .end();

        next();
      });
  }
}
