import sprintf from 'sprintf';

const parts = {
  link: {
    complex: `
      REPLACE INTO %s.link_%s_%s
      SET ?`,
    simple: `
      REPLACE INTO %s.%s_%s
      SET ?`
  },
  object: `
    UPDATE %s.%s
    SET ?
    WHERE %s_id = ?`
};

export default class MysqlUpdate {
  link(path, type) {
    return sprintf(
      parts.link[type],
      '%(db)s',
      path[0],
      path[1]
    );
  }

  object(name) {
    return sprintf(
      parts.object,
      '%(db)s',
      name,
      name
    );
  }
}
