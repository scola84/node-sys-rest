import sprintf from 'sprintf';

const parts = {
  object: `
    INSERT INTO %s.%s
    SET ?`
};

export default class MysqlInsert {
  id(result) {
    return result.insertId;
  }

  object(name) {
    return sprintf(
      parts.object,
      '%(db)s',
      name
    );
  }
}
