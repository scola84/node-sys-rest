import { Validator } from '@scola/validator';
import Route from '../../route';

const validator = new Validator();
validator.field('oid').cast().integer();
validator.field('cid').cast().integer();

export default class WriteLinkRoute extends Route {
  _validatePath(request, response, next) {
    const child = request.param('child');

    if (this._config.children.indexOf(child) === -1) {
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

    if (user.may(this._config.name + '.sudo') === true) {
      next();
      return;
    }

    const oid = request.param('oid');
    const uid = user.id();

    const upath = this._rest.structure('user.children');

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

  _authorizeUserChild(request, response, next) {
    const child = request.param('child');
    const user = request.connection().user();

    if (user.may(child + '.sudo') === true) {
      next();
      return;
    }

    const cid = request.param('cid');
    const uid = user.id();

    const upath = this._rest.structure('user.children');

    this._user(upath, uid, (uerror, ulist) => {
      if (uerror) {
        next(uerror);
        return;
      }

      const parents = this._rest.structure(child + '.parents');

      if (parents.length === 0) {
        if (ulist[child].indexOf(cid) > -1) {
          next();
          return;
        }
      }

      const cpath = this._rest.path(child);

      this._object(cpath, cid, (cerror, clist) => {
        if (cerror) {
          next(cerror);
          return;
        }

        const list = Object.keys(clist);
        let found = list.length === 0;

        found = found || list.some((parent) => {
          return ulist[parent].filter((i) => {
            return clist[parent].indexOf(i) > -1;
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
