import sprintf from 'sprintf';

const parts = {
  link: {
    complex: `
      DELETE FROM %s.link_%s_%s
      WHERE
        %s_id = ? AND
        %s_id = ?`,
    simple: `
      DELETE FROM %s.%s_%s
      WHERE
        %s_id = ? AND
        %s_id = ?`
  },
  object: `
    DELETE FROM %s.%s
    WHERE %s_id = ?`
};

export default class MysqlDelete {
  link(path, type) {
    return sprintf(
      parts.link[type],
      '%(db)s',
      path[0],
      path[1],
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
