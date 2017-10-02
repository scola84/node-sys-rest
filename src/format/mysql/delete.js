import sprintf from 'sprintf';

const parts = {
  link: `
    DELETE FROM %s.link_%s_%s
    WHERE
      %s_id = ? AND
      %s_id = ?`,
  object: {
    delete: `
      DELETE FROM %s.%s`,
    where: {
      all: `
        WHERE 1`,
      id: `
        AND %s_id = ?`,
      etag: `
        AND %s = ?`
    }
  }
};

export default class MysqlDelete {
  changed(result) {
    return result.affectedRows > 0;
  }

  complex(path, ids) {
    const query = sprintf(
      parts.link,
      '%(db)s',
      path[0],
      path[1],
      path[0],
      path[1]
    );

    const values = [
      ids.oid,
      ids.cid
    ];

    return [query, values];
  }

  simple(path, ids, field, etag) {
    const name = path.join('_');

    let query = sprintf(parts.object.delete, '%(db)s', name);
    const values = [];

    query += parts.object.where.all;
    query += sprintf(parts.object.where.id, path[0]);
    values.push(ids.oid);

    query += sprintf(parts.object.where.id, path[1]);
    values.push(ids.cid);

    if (field !== null && etag !== null) {
      query += sprintf(parts.object.where.etag, field);
      values.push(etag);
    }

    return [query, values];
  }

  object(name, id, field, etag) {
    let query = sprintf(parts.object.delete, '%(db)s', name);
    const values = [];

    query += parts.object.where.all;
    query += sprintf(parts.object.where.id, name);
    values.push(id);

    if (field !== null && etag !== null) {
      query += sprintf(parts.object.where.etag, field);
      values.push(etag);
    }

    return [query, values];
  }
}
