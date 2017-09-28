import eachOf from 'async/eachOf';
import waterfall from 'async/waterfall';

export default class Route {
  constructor() {
    this._config = null;
    this._format = null;
    this._rest = null;
    this._server = null;
    this._structure = null;
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

  structure(value = null) {
    if (value === null) {
      return this._structure;
    }

    this._structure = value;
    return this;
  }

  _user(fields, id, callback) {
    const user = {};

    eachOf(fields, (field, index, eachCallback) => {
      const query = this._format
        .format('auth')
        .user(field);

      const prefix = [
        'user',
        id,
        field
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

  _object(fields, id, callback) {
    const object = {};

    const tasks = fields.slice(0, -1).map((field, index) => {
      return (ids, taskCallback) => {
        const query = this._format
          .format('auth')
          .object(field, fields[index + 1]);

        const prefix = [
          fields[0],
          id,
          fields[index + 1]
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

  _authorize(user, name, oid, callback) {
    if (user.may(name + '.sudo') === true) {
      callback();
      return;
    }

    const uid = user.id();
    const upath = this._rest.structure('user.complex');

    this._user(upath, uid, (uerror, ulist) => {
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

      this._object(opath, oid, (oerror, olist) => {
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
}
