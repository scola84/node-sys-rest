import get from 'lodash-es/get';

export default class User {
  constructor() {
    this._details = {};
    this._id = null;
    this._masks = {};
    this._permissions = {};
    this._token = null;
  }

  detail(name) {
    return this._details[name];
  }

  details(value = null) {
    if (value === null) {
      return this._details;
    }

    this._details = value;
    return this;
  }

  id(value = null) {
    if (value === null) {
      return this._id;
    }

    this._id = value;
    return this;
  }

  masks(value = null) {
    if (value === null) {
      return this._masks;
    }

    this._masks = value;
    return this;
  }

  permissions(value = null) {
    if (value === null) {
      return this._permissions;
    }

    this._permissions = value;
    return this;
  }

  token(value = null) {
    if (value === null) {
      return this._token;
    }

    this._token = value;
    return this;
  }

  may(field) {
    field = field.split('.');

    if (field[field.length - 1] === '*') {
      return this._mayWildcard(field.slice(0, -1));
    }

    return this._may(field);
  }

  toObject() {
    return {
      details: this._details,
      id: this._id,
      permissions: this._permissions,
      token: this._token
    };
  }

  _may(field) {
    const permission = this._permissions[field[0]];
    const mask = get(this._masks, field);

    return (permission & mask) > 0;
  }

  _mayWildcard(field) {
    const permission = this._permissions[field[0]];
    const masks = get(this._masks, field);

    return Object.keys(masks).some((key) => {
      return (permission & masks[key]) > 0;
    });
  }
}
