import { Validator } from '@scola/validator';
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

        response
          .header('x-total', result[0].total);

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

    qo.execute(values, (error, result, hash) => {
      if (error) {
        next(request.error('500 invalid_query ' + error));
        return;
      }

      const ended = this._addEtag(request, response, hash);

      if (ended === false) {
        result = this._applyFilter(result);
        response.status(200);

        const write =
          Number(request.header('x-more')) === 1 &&
          this._subscribe === true;

        if (write === true) {
          response.write(result);
        } else {
          response.end(result);
        }
      }

      next();
    });
  }

  _handlePubsub(event) {
    this._server
      .cache()
      .invalidate(this._config.name);

    this._server
      .pubsub()
      .fanout('/' + this._config.name)
      .publish(event);
  }
}
