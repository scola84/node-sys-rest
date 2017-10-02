import sprintf from 'sprintf';

const parts = {
  object: `
    SELECT *
    FROM %s.link_%s_%s
    WHERE %s_id IN (?)`,
  user: `
    SELECT *
    FROM %s.link_user_%s
    WHERE user_id = ?`,
};

export default class MysqlAuth {
  object(left, right, ids) {
    const query = sprintf(
      parts.object,
      '%(db)s',
      right,
      left,
      left
    );

    return [query, ids];
  }

  user(field, id) {
    const query = sprintf(
      parts.user,
      '%(db)s',
      field
    );

    return [query, id];
  }
}
