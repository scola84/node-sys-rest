import Route from '../../route';

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

    this._rest
      .validator()
      .validate(request.params(), next);
  }

  _validateData(request, response, next) {
    const child = request.param('child');

    if (this._validator === null) {
      next();
      return;
    }

    const validator = this._validator[child];

    if (typeof validator === 'undefined') {
      next();
      return;
    }

    validator.validate(request.data(), next);
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

  _publishLink(request, response, next) {
    this._server
      .pubsub()
      .client()
      .publish(this._rest.config('pubsub.path'), {
        event: this._config.name,
        data: {
          meta: {
            child: request.param('child'),
            cid: response.datum('cid'),
            method: request.method(),
            oid: request.param('oid'),
            publish: true
          },
          data: request.data()
        }
      });

    next();
  }
}
