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
  object(left, right) {
    return sprintf(
      parts.object,
      '%(db)s',
      right,
      left,
      left
    );
  }

  user(field) {
    return sprintf(
      parts.user,
      '%(db)s',
      field
    );
  }
}
