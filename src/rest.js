import get from 'lodash-es/get';
import MysqlFormat from './format/mysql';

const format = {
  mysql: MysqlFormat
};

export default class Rest {
  constructor() {
    this._config = null;
    this._format = null;
    this._paths = {};
    this._routes = {};
    this._server = null;
    this._structure = {};
  }

  config(value = null) {
    if (value === null) {
      return this._config;
    }

    if (typeof value === 'string') {
      return get(this._config, value);
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

    if (typeof value === 'string') {
      return get(this._structure, value);
    }

    this._structure = value;
    return this;
  }

  route(name, factory) {
    this._routes[name] = this._routes[name] || [];
    this._routes[name].push(factory);

    return this;
  }

  routes(name, factories) {
    this._routes[name] = this._routes[name] || [];
    this._routes[name] = this._routes[name].concat(factories);

    return this;
  }

  path(left, right = null) {
    if (right === null) {
      right = this._config.root;
    }

    const key = left + right;

    if (this._paths[key]) {
      return this._paths[key];
    }

    this._paths[key] = [left];
    this._path(this._structure[right].complex, left, this._paths[key]);
    this._paths[key].push(right);

    return this._paths[key];
  }

  start() {
    if (this._format === null) {
      this._format = new format[this._config.database.format]();
    }

    this._build(() => {
      Object.keys(this._routes).forEach((name) => {
        this._routes[name].forEach((factory) => {
          factory()
            .rest(this)
            .format(this._format)
            .server(this._server)
            .config(this._structure[name])
            .start();
        });
      });
    });
  }

  _build(callback) {
    const [query] = this._format
      .format('config')
      .structure();

    this._server
      .database()
      .connection(this._config.database.source)
      .query(query, (error, tables) => {
        if (error) {
          this._server.emit('error', error);
          return;
        }

        tables.forEach((table) => {
          if (table.name.match(/link_/) !== null) {
            this._complex(this._structure, table.name);
          } else if (table.name.match(/_/) !== null) {
            this._simple(this._structure, table.name);
          } else {
            this._object(this._structure, table.name);
          }
        });

        callback();
      });
  }

  _complex(structure, name) {
    const [, object, child] = name.split('_');

    this._object(structure, object);
    this._object(structure, child);

    structure[object].complex.push(child);

    if (object !== 'user') {
      structure[child].parents.push(object);
    }
  }

  _simple(structure, name) {
    const [object, child] = name.split('_');

    if (typeof structure[object] === 'undefined') {
      return;
    }

    structure[object].simple.push(child);
  }

  _object(structure, name) {
    if (typeof structure[name] === 'undefined') {
      structure[name] = {
        complex: [],
        database: this._config.database.source,
        name,
        parents: [],
        simple: []
      };
    }
  }

  _path(complex, right, path = []) {
    if (complex.indexOf(right) > -1) {
      return true;
    }

    return complex.some((child) => {
      if (this._structure[child]) {
        const found = this._path(this._structure[child].complex,
          right, path);

        if (found === true) {
          path.push(child);
          return true;
        }
      }

      return false;
    });
  }
}
