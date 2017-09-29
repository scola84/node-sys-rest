import { Validator } from '@scola/validator';
import Route from '../../route';

const validator = new Validator();
validator.field('oid').cast().integer();
validator.field('cid').cast().integer();

export default class WriteLinkRoute extends Route {
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

    if (user.may(this._config.name + '.write') === false) {
      next(request.error('403 invalid_auth'));
      return;
    }

    next();
  }

  _authorizeUserObject(request, response, next) {
    const user = request.connection().user();
    const name = this._config.name;
    const id = request.param('oid');

    this._authorizeRequest(user, name, id, (error) => {
      if (error) {
        next(request.error('403 invalid_auth'));
        return;
      }

      next();
    });
  }

  _authorizeUserChild(request, response, next) {
    const user = request.connection().user();
    const name = request.param('child');
    const id = request.param('cid');

    if (this._config.simple.indexOf(name) > -1) {
      next();
      return;
    }

    this._authorizeRequest(user, name, id, (error) => {
      if (error) {
        next(request.error('403 invalid_auth'));
        return;
      }

      next();
    });
  }
}
