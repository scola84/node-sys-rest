import sprintf from 'sprintf';

const parts = {
  link: `
    INSERT INTO %s.%s_%s
    SET ?`,
  object: `
    INSERT INTO %s.%s
    SET ?`
};

export default class MysqlInsert {
  id(result) {
    return result.insertId;
  }

  link(path) {
    return sprintf(
      parts.link,
      '%(db)s',
      path[0],
      path[1]
    );
  }

  object(name) {
    return sprintf(
      parts.object,
      '%(db)s',
      name
    );
  }
}
