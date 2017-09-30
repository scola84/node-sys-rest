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
  object: {
    delete: `
      DELETE FROM %s.%s`,
    where: {
      all: `
        WHERE %s_id = ?`,
      etag: `
        AND %s = ?`
    }
  }
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

  object(name, id, field, etag) {
    let query = sprintf(parts.object.delete, '%(db)s', name);
    const values = [];

    query += sprintf(parts.object.where.all, name);
    values.push(id);

    if (field !== null && etag !== null) {
      query += sprintf(parts.object.where.etag, field);
      values.push(etag);
    }

    return [query, values];
  }
}
