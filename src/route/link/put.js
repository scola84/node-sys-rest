import shortid from 'shortid';
import WriteLinkRoute from './write';

export default class PutLinkRoute extends WriteLinkRoute {
  start() {
    this._server
      .router()
      .put(
        '/' + this._config.name + '/:oid/:child/:cid',
        ...this._handlers({
          validate: [
            (rq, rs, n) => this._validatePath(rq, rs, n),
            (rq, rs, n) => this._validateData(rq, rs, n)
          ],
          authorize: [
            (rq, rs, n) => this._checkUser(rq, rs, n),
            (rq, rs, n) => this._authorizeRole(rq, rs, n),
            (rq, rs, n) => this._authorizeUserObject(rq, rs, n),
            (rq, rs, n) => this._authorizeUserChild(rq, rs, n)
          ],
          execute: [
            (rq, rs, n) => this._updateLink(rq, rs, n)
          ],
          publish: [
            (rq, rs, n) => this._publishLink(rq, rs, n)
          ]
        })
      )
      .extract();
  }

  _validateData(request, response, next) {
    next();
  }

  _updateLink(request, response, next) {
    const child = request.param('child');

    if (this._config.simple.indexOf(child) > -1) {
      this._updateSimple(request, response, next);
      return;
    }

    this._updateComplex(request, response, next);
  }

  _updateSimple(request, response, next) {
    const params = request.params();
    const child = request.param('child');

    const path = [
      this._config.name,
      child
    ];

    const data = this._applyFilter(Object.assign({
      [this._config.name + '_id']: params.oid,
      [child + '_id']: params.cid
    }, request.data()));

    if (this._etag) {
      data[this._etag] = '"' + shortid.generate() + '"';
    }

    const etag = request.header('If-Match');

    const [query, values] = this._format
      .format('update')
      .simple(path, data, params, this._etag, etag);

    this._update(query, values, etag, request, response, next);
  }

  _updateComplex(request, response, next) {
    const params = request.params();
    const child = request.param('child');

    const path = [
      this._config.name,
      child
    ];

    const data = this._applyFilter({
      [this._config.name + '_id']: params.oid,
      [child + '_id']: params.cid
    });

    const [query, values] = this._format
      .format('update')
      .complex(path, data);

    this._update(query, values, null, request, response, next);
  }

  _update(query, values, etag, request, response, next) {
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
          .datum('cid', request.param('cid'))
          .end();

        next();
      });
  }
}
