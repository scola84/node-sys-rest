import Route from './route';

export default class WriteLinkRoute extends Route {
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

  _publishLink(request, response, next) {
    const child = request.param('child');

    if (this._config.simple.indexOf(child) > -1) {
      this._publishObject(request, response);
    }

    if (this._config.complex.indexOf(child) > -1) {
      this._publishParent(request, response);
      this._publishChild(request, response);
    }

    next();
  }

  _publishObject(request, response) {
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
  }

  _publishParent(request) {
    this._server
      .pubsub()
      .client()
      .publish(this._rest.config('pubsub.path'), {
        event: this._config.name,
        data: {
          meta: {
            child: request.param('child'),
            method: request.method(),
            oid: request.param('oid'),
            publish: true
          }
        }
      });
  }

  _publishChild(request, response) {
    this._server
      .pubsub()
      .client()
      .publish(this._rest.config('pubsub.path'), {
        event: request.param('child'),
        data: {
          meta: {
            child: this._config.name,
            method: request.method(),
            oid: response.datum('cid'),
            publish: true
          }
        }
      });
  }
}
