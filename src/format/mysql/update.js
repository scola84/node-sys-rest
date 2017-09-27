import sprintf from 'sprintf';

const parts = {
  link: `
    INSERT INTO %s.link_%s_%s
    SET ?
    ON DUPLICATE KEY UPDATE ?`,
  object: `
    UPDATE %s.%s
    SET ?
    WHERE %s_id = ?`
};

export default class MysqlUpdate {
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
      name,
      name
    );
  }
}
