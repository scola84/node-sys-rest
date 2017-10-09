import sprintf from 'sprintf';

const parts = {
  basic: `
    SELECT ub.*, u.*, r.*
    FROM %s.user_basic ub
    LEFT JOIN %s.user u ON
      ub.user_id = u.user_id
    LEFT JOIN (%s.link_role_user lru, %s.role r) ON
      ub.user_id = lru.user_id AND
      r.role_id = lru.role_id
    WHERE ub.username = ?`,
  bearer: `
    SELECT ub.*, u.*, r.*
    FROM %s.user_bearer ub
    LEFT JOIN %s.user u ON
      ub.user_id = u.user_id
    LEFT JOIN (%s.link_role_user lru, %s.role r) ON
      ub.user_id = lru.user_id AND
      r.role_id = lru.role_id
    WHERE ub.token = ?`,
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
  basic(credentials) {
    const query = sprintf(
      parts.basic,
      '%(db)s',
      '%(db)s',
      '%(db)s',
      '%(db)s'
    );

    return [query, credentials[0]];
  }

  bearer(token) {
    const query = sprintf(
      parts.bearer,
      '%(db)s',
      '%(db)s',
      '%(db)s',
      '%(db)s'
    );

    return [query, token];
  }

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
