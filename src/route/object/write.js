import Route from './route';

export default class WriteObjectRoute extends Route {
  _validateData(request, response, next) {
    next();
  }

  _authorizeRole(request, response, next) {
    const user = request.connection().user();

    if (user.may(this._config.name + '.write') === false) {
      next(request.error('403 invalid_auth'));
      return;
    }

    next();
  }
}
