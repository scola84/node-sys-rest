export default class AbstractAuth {
  constructor() {
    this._config = null;
    this._format = null;
    this._rest = null;
    this._server = null;
  }

  config(value = null) {
    if (value === null) {
      return this._config;
    }

    this._config = value;
    return this;
  }

  format(value = null) {
    if (value === null) {
      return this._format;
    }

    this._format = value;
    return this;
  }

  rest(value = null) {
    if (value === null) {
      return this._rest;
    }

    this._rest = value;
    return this;
  }

  server(value = null) {
    if (value === null) {
      return this._server;
    }

    this._server = value;
    return this;
  }

  _user(raw) {
    const user = {
      id: 0,
      details: {},
      permissions: {},
      token: null
    };

    if (typeof raw.ub.username !== 'undefined') {
      user.details.username = raw.ub.username;
    }

    if (typeof raw.ub.token !== 'undefined') {
      user.token = raw.ub.token;
    }

    Object.keys(raw.u).forEach((name) => {
      if (name === 'user_id') {
        user.id = raw.u[name];
      } else {
        user.permissions[name] =
          raw.r[name] || raw.u[name] || 0;
      }
    });

    return this._rest.user(user);
  }
}
