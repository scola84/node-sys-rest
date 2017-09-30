import eachOf from 'async/eachOf';
import waterfall from 'async/waterfall';

export default class Route {
  constructor() {
    this._cache = true;
    this._config = null;
    this._etag = '_etag';
    this._filter = (o) => o;
    this._format = null;
    this._publish = true;
    this._rest = null;
    this._server = null;
    this._subscribe = true;
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

  filter(value = null) {
    if (value === null) {
      return this._filter;
    }

    this._filter = value;
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

  _bindPubsub() {
    this._server
      .pubsub()
      .client()
      .subscribe(this._rest.config('pubsub.path'))
      .on(this._config.name, (event) => {
        this._handlePubsub(event);
      });
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
      const query = this._format
        .format('auth')
        .user(field);

      const prefix = [
        'user',
        id
      ].join(':');

      const values = [id];

      this._server
        .database()
        .connection(this._config.database)
        .query(query)
        .prefix(prefix)
        .execute(values, (error, result) => {
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
        const query = this._format
          .format('auth')
          .object(field, fields[index + 1]);

        const prefix = [
          fields[0],
          id
        ].join(':');

        const values = [ids];

        this._server
          .database()
          .connection(this._config.database)
          .query(query)
          .prefix(prefix)
          .execute(values, (error, result) => {
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

  _applyFilter(list) {
    return this._filter(list);
  }

  _subscribeRequest(request, response) {
    const cancel =
      this._subscribe === false ||
      Number(request.header('x-more')) === 0;

    if (cancel === true) {
      return;
    }

    this._server
      .pubsub()
      .fanout(request.path())
      .subscribe(request, response);
  }

  _handlePubsub() {}
}
