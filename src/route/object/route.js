import { Validator } from '@scola/validator';
import Route from '../../route';

const validator = new Validator();
validator.field('id').cast().integer();

export default class ObjectRoute extends Route {
  _validatePath(request, response, next) {
    validator.validate(request.params(), next);
  }

  _authorizeUser(request, response, next) {
    const user = request.connection().user();

    if (user.may(this._config.name + '.sudo') === true) {
      next();
      return;
    }

    const oid = request.param('id');
    const uid = user.id();

    const upath = this._rest.structure('user.complex');

    this._user(upath, uid, (uerror, ulist) => {
      if (uerror) {
        next(uerror);
        return;
      }

      if (this._config.parents.length === 0) {
        if (ulist[this._config.name].indexOf(oid) > -1) {
          next();
          return;
        }
      }

      const opath = this._rest.path(this._config.name);

      this._object(opath, oid, (oerror, olist) => {
        if (oerror) {
          next(oerror);
          return;
        }

        const found = Object.keys(olist).some((parent) => {
          return ulist[parent].filter((i) => {
            return olist[parent].indexOf(i) > -1;
          }).length > 0;
        });

        if (found === false) {
          next(request.error('403 invalid_auth'));
          return;
        }

        next();
      });
    });
  }

  _filter(object) {
    return object;
  }
}
