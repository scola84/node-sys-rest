import ObjectRoute from './route';

export default class WriteObjectRoute extends ObjectRoute {
  _validateData(request, response, next) {
    if (this._validator === null) {
      next();
      return;
    }

    this._validator.validate(request.data(), next);
  }

  _authorizeRole(request, response, next) {
    const user = request.connection().user();

    if (user.may(this._config.name + '.write') === false) {
      next(request.error('403 invalid_auth'));
      return;
    }

    next();
  }

  _publishObject(request, response, next) {
    this._server
      .pubsub()
      .client()
      .publish(this._rest.config('pubsub.path'), {
        event: this._config.name,
        data: {
          meta: {
            method: request.method(),
            oid: response.datum('oid'),
            publish: true
          },
          data: request.data()
        }
      });

    next();
  }
}
