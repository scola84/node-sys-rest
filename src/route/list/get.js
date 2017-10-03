import { Validator } from '@scola/validator';
import omit from 'lodash-es/omit';
import md5 from 'crypto-js/md5';
import Route from '../../route';

const validator = new Validator();

validator.field('l.cnt').cast().default(10).integer();
validator.field('l.off').cast().default(0).integer();
validator.strict();

export default class GetListRoute extends Route {
  start() {
    this._server
      .router()
      .get(
        '/' + this._config.name,
        (rq, rs, n) => this._validateQuery(rq, rs, n),
        (rq, rs, n) => this._checkUser(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._prepareSelect(rq, rs, n),
        (rq, rs, n) => this._selectTotal(rq, rs, n),
        (rq, rs, n) => this._selectList(rq, rs, n),
        (rq, rs, n) => this._subscribeRequest(rq, rs, n)
      );

    if (this._subscribe === true) {
      this._bindPubsub();
    }
  }

  _validateQuery(request, response, next) {
    validator.validate(request.query(), next);
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

    this._server
      .database()
      .connection(this._config.database)
      .query(query)
      .prefix(this._config.name)
      .execute(values, (error, result) => {
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
      qo.prefix(this._config.name);
    }

    qo.execute(values, (error, data) => {
      if (error) {
        next(request.error('500 invalid_query ' + error));
        return;
      }

      data = this._applyFilter({
        meta: {
          total: response.datum('total')
        },
        data
      });

      const ended = this._handleEtag(request, response,
        data.data, this._etag);

      if (ended === true) {
        next();
        return;
      }

      response.status(200);

      const write =
        request.header('Connection') === 'keep-alive' &&
        this._subscribe === true;

      if (write === true) {
        response.write(data);
      } else {
        response.end(data);
      }

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
      response
        .status(304)
        .end();

      return true;
    }

    return false;
  }

  _handlePubsub(event) {
    this._server
      .cache()
      .invalidate(this._config.name);

    this._server
      .pubsub()
      .fanout('/' + this._config.name)
      .publish(omit(event, 'data'));
  }
}
