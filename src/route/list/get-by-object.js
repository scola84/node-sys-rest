import { Validator } from '@scola/validator';
import GetListRoute from './get';

const validator = new Validator();
validator.field('id').cast().integer();

export default class GetListByObjectRoute extends GetListRoute {
  start() {
    this._server
      .router()
      .get(
        '/' + this._config.name + '/:id/:child',
        (rq, rs, n) => this._validatePath(rq, rs, n),
        (rq, rs, n) => this._validateQuery(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._authorizeUser(rq, rs, n),
        (rq, rs, n) => this._prepareSelect(rq, rs, n),
        (rq, rs, n) => this._selectTotal(rq, rs, n),
        (rq, rs, n) => this._selectList(rq, rs, n)
      );
  }

  _validatePath(request, response, next) {
    const child = request.param('child');

    const isChild =
      this._config.complex.indexOf(child) > -1 ||
      this._config.simple.indexOf(child) > -1;

    if (isChild === false) {
      next(request.error('404 invalid_path'));
      return;
    }

    validator.validate(request.params(), next);
  }

  _authorizeRole(request, response, next) {
    const user = request.connection().user();

    if (user.may(this._config.name + '.read') === false) {
      next(request.error('403 invalid_auth'));
      return;
    }

    next();
  }

  _authorizeUser(request, response, next) {
    const user = request.connection().user();
    const name = this._config.name;
    const id = request.param('id');

    this._authorize(user, name, id, (error) => {
      if (error) {
        next(request.error('403 invalid_auth'));
        return;
      }

      next();
    });
  }

  _prepareSelect(request, response, next) {
    const child = request.param('child');

    let path = [child, this._config.name];
    const values = [request.param('id')];

    if (this._config.simple.indexOf(child) > -1) {
      path = [path.reverse().join('_'), null];
    }

    request.datum('path', path);
    request.datum('values', values);

    next();
  }
}
