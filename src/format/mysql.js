import MysqlAuth from './mysql/auth';
import MysqlConfig from './mysql/config';
import MysqlDelete from './mysql/delete';
import MysqlSelect from './mysql/select';
import MysqlInsert from './mysql/insert';
import MysqlUpdate from './mysql/update';

const formats = {
  auth: MysqlAuth,
  config: MysqlConfig,
  delete: MysqlDelete,
  insert: MysqlInsert,
  select: MysqlSelect,
  update: MysqlUpdate
};

export default class MysqlFormat {
  constructor() {
    this._formats = {};
  }

  format(name) {
    if (typeof this._formats[name] === 'undefined') {
      this._formats[name] = new formats[name];
    }

    return this._formats[name];
  }
}
