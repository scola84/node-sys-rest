import eachOf from 'async/eachOf';
import waterfall from 'async/waterfall';
import extractData from './helper/extract-data';

export default class Route {
  constructor() {
    this._authorize = true;
    this._cache = true;
    this._config = null;
    this._etag = '_etag';
    this._extract = extractData();
    this._format = null;
    this._handlers = [];
    this._publish = true;
    this._rest = null;
    this._server = null;
    this._subscribe = true;
    this._transform = null;
    this._validate = true;
    this._validator = null;
  }

  authorize(value = null) {
    if (value === null) {
      return this._authorize;
    }

    this._authorize = value;
    return this;
  }

  cache(value = null) {
    if (value === null) {
      return this._cache;
    }

    this._cache = value;
    return this;
  }

  config(value = null) {
    if (value === null) {
      return this._config;
    }

    this._config = value;
    return this;
  }

  etag(value = null) {
    if (value === null) {
      return this._etag;
    }

    if (value === false) {
      this._etag = null;
    }

    this._etag = value;
    return this;
  }

  extract(value = null) {
    if (value === null) {
      return this._extract;
    }

    this._extract = value;
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

  subscribe(value = null) {
    if (value === null) {
      return this._subscribe;
    }

    this._subscribe = value;
    return this;
  }

  transform(value = null) {
    if (value === null) {
      return this._transform;
    }

    this._transform = value;
    return this;
  }

  validate(value = null) {
    if (value === null) {
      return this._validate;
    }

    this._validate = value;
    return this;
  }

  validator(value = null) {
    if (value === null) {
      return this._validator;
    }

    this._validator = value;
    return this;
  }

  _handler(handlers, action = true) {
    if (action === true) {
      this._handlers = this._handlers.concat(handlers);
    }

    return this;
  }

  _delete(path) {
    this._server
      .router()
      .delete(path, ...this._handlers);
  }

  _get(path) {
    this._server
      .router()
      .get(path, ...this._handlers);

    if (this._subscribe === true || this._cache === true) {
      this._bindPubsub();
    }
  }

  _patch(path) {
    this._server
      .router()
      .patch(path, ...this._handlers);
  }

  _post(path) {
    this._server
      .router()
      .post(path, ...this._handlers);
  }

  _put(path) {
    this._server
      .router()
      .put(path, ...this._handlers);
  }

  _bindPubsub() {
    this._server
      .pubsub()
      .client()
      .subscribe(this._rest.config('pubsub.path'))
      .on(this._config.name, (event) => {
        this._handlePubsub(event);
      });
  }

  _checkUser(request, response, next) {
    const user = request.connection().user();

    if (user === null) {
      next(request.error('401 invalid_auth'));
      return;
    }

    next();
  }

  _authorizeRequest(user, name, oid, callback) {
    if (user.may(name + '.sudo') === true) {
      callback();
      return;
    }

    const uid = user.id();
    const upath = this._rest.structure('user.complex');

    this._buildUserAuth(upath, uid, (uerror, ulist) => {
      if (uerror) {
        callback(uerror);
        return;
      }

      const parents = this._rest.structure(name + '.parents');

      if (parents.length === 0) {
        if (ulist[name].indexOf(oid) > -1) {
          callback();
        } else {
          callback(new Error('No parent found'));
        }

        return;
      }

      const opath = this._rest.path(name);

      this._buildObjectAuth(opath, oid, (oerror, olist) => {
        if (oerror) {
          callback(oerror);
          return;
        }

        const found = Object.keys(olist).some((parent) => {
          return ulist[parent].filter((id) => {
            return olist[parent].indexOf(id) > -1;
          }).length > 0;
        });

        if (found === false) {
          callback(new Error('No parent found'));
          return;
        }

        callback();
      });
    });
  }

  _buildUserAuth(fields, id, callback) {
    const user = {};

    eachOf(fields, (field, index, eachCallback) => {
      const [query, values] = this._format
        .format('auth')
        .user(field, id);

      const qo = this._server
        .database()
        .connection(this._config.database)
        .query(query);

      if (this._cache === true) {
        qo.prefix([
          'user',
          id
        ].join(':'));
      }

      qo.execute(values, (error, result) => {
        if (error) {
          eachCallback(error);
          return;
        }

        user[field] = result.map((value) => {
          return value[field + '_id'];
        });

        eachCallback();
      });
    }, (error) => {
      if (error) {
        callback(error);
        return;
      }

      callback(null, user);
    });
  }

  _buildObjectAuth(fields, id, callback) {
    const object = {};

    const tasks = fields.slice(0, -1).map((field, index) => {
      return (ids, taskCallback) => {
        const [query, values] = this._format
          .format('auth')
          .object(field, fields[index + 1], ids);

        const qo = this._server
          .database()
          .connection(this._config.database)
          .query(query);

        if (this._cache === true) {
          qo.prefix([
            fields[0],
            id
          ].join(':'));
        }

        qo.execute(values, (error, result) => {
          if (error) {
            taskCallback(error);
            return;
          }

          if (result.length === 0) {
            taskCallback(true);
            return;
          }

          object[fields[index + 1]] = result.map((value) => {
            return value[fields[index + 1] + '_id'];
          });

          taskCallback(null, object[fields[index + 1]]);
        });
      };
    });

    tasks.unshift((taskCallback) => {
      taskCallback(null, [id]);
    });

    waterfall(tasks, (error) => {
      if (error instanceof Error === true) {
        callback(error);
        return;
      }

      callback(null, object);
    });
  }

  _extractData(request, response, next) {
    if (this._extract === null) {
      next();
      return;
    }

    this._extract(request, response, next);
  }

  _transformData(request, response, next) {
    if (this._transform === null) {
      next();
      return;
    }

    this._transform(request, response, next);
  }

  _sendResponse(request, response, next) {
    let status = 200;
    let data = response.data();

    const write =
      request.header('Connection') === 'keep-alive' &&
      request.codec() === false &&
      this._subscribe === true;

    const match = this._handleEtag(request, response,
      data.data, this._etag);

    if (match === true) {
      status = 304;
      data = '';
    }

    response.status(status);

    if (request.method() === 'HEAD') {
      response.encoder().option('push', false);
    }

    if (write === true) {
      response.write(data);
    } else {
      response.end(data);
    }

    next();
  }

  _handleEtag(request, response, data, field) {
    if (field === false) {
      return false;
    }

    const cancel =
      this._etag === false ||
      typeof data[field] === 'undefined';

    if (cancel === true) {
      return false;
    }

    response.header('Etag', data[field]);

    if (request.header('If-None-Match') === data[field]) {
      return true;
    }

    delete data[field];
    return false;
  }

  _subscribeRequest(request, response) {
    if (request.codec() !== false) {
      return;
    }

    this._server
      .pubsub()
      .fanout(request.path())
      .subscribe(request, response);
  }

  _handlePubsub(event) {
    if (this._cache === true) {
      this._invalidateCache(event);
    }

    if (this._subscribe === true) {
      this._publishChange(event);
    }
  }

  _invalidateCache() {}

  _publishChange() {}
}
