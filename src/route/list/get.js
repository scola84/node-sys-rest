import omit from 'lodash-es/omit';
import md5 from 'crypto-js/md5';
import Route from '../../route';

export default class GetListRoute extends Route {
  start() {
    this._handler([
      (rq, rs, n) => this._validateQuery(rq, rs, n)
    ], this._validate);

    this._handler([
      (rq, rs, n) => this._authenticateUser(rq, rs, n),
      (rq, rs, n) => this._authorizeRole(rq, rs, n)
    ], this._authorize);

    this._handler([
      (rq, rs, n) => this._prepareSelect(rq, rs, n),
      (rq, rs, n) => this._selectTotal(rq, rs, n),
      (rq, rs, n) => this._selectList(rq, rs, n),
      (rq, rs, n) => this._transformData(rq, rs, n),
      (rq, rs, n) => this._sendResponse(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._subscribeRequest(rq, rs, n)
    ], this._subscribe);

    this._get('/' + this._config.name);
  }

  _validateQuery(request, response, next) {
    if (this._validator === null) {
      next();
      return;
    }

    this._validator.validate(request.query(), next);
  }

  _validatePath(request, response, next) {
    const parent = request.param('parent');
    const structure = this._rest.structure(parent);

    if (typeof structure === 'undefined') {
      next(request.error('404 invalid_path'));
      return;
    }

    next();
  }

  _authorizeRole(request, response, next) {
    const user = request.connection().user();

    if (user.may(this._config.name + '.sudo') === false) {
      next(request.error('403 invalid_auth'));
      return;
    }

    next();
  }

  _prepareSelect(request, response, next) {
    request.datum('path', [this._config.name]);
    request.datum('values', []);

    next();
  }

  _selectTotal(request, response, next) {
    const [query, values] = this._format
      .format('select')
      .total(
        request.datum('path'),
        request.datum('values').slice(),
        request.query()
      );

    const qo = this._server
      .database()
      .connection(this._config.database)
      .query(query);

    if (this._cache === true) {
      qo.prefix([
        '',
        this._config.name,
      ].join('/'));
    }

    qo.execute(values, (error, result) => {
      if (error) {
        next(request.error('500 invalid_query ' + error));
        return;
      }

      response.datum('total', result[0].total);
      next();
    });
  }

  _selectList(request, response, next) {
    const [query, values] = this._format
      .format('select')
      .list(
        request.datum('path'),
        request.datum('values').slice(),
        request.query()
      );

    const qo = this._server
      .database()
      .connection(this._config.database)
      .query(query);

    if (this._cache === true) {
      qo.prefix([
        '',
        this._config.name,
      ].join('/'));
    }

    qo.execute(values, (error, data) => {
      if (error) {
        next(request.error('500 invalid_query ' + error));
        return;
      }

      response.data({
        meta: {
          total: response.datum('total')
        },
        data
      });

      next();
    });
  }

  _handleEtag(request, response, list, field) {
    if (field === false) {
      return false;
    }

    const base = list.map((item) => {
      const etag = item[field];
      delete item[field];
      return etag;
    }).join('');

    const cancel =
      this._etag === false ||
      base === '';

    if (cancel === true) {
      return false;
    }

    const hash = '"' + md5(base) + '"';

    response.header('Etag', hash);

    if (request.header('If-None-Match') === hash) {
      return true;
    }

    return false;
  }

  _invalidateCache() {
    this._server
      .cache()
      .invalidate([
        '',
        this._config.name
      ].join('/'));
  }

  _publishChange(event) {
    this._server
      .pubsub()
      .fanout([
        '',
        this._config.name
      ].join('/'))
      .publish(omit(event, 'data'));
  }
}
