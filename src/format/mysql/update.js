import sprintf from 'sprintf';

const parts = {
  link: `
    REPLACE INTO %s.link_%s_%s
    SET ?`,
  object: {
    update: `
      UPDATE %s.%s`,
    set: `
      SET ?`,
    where: {
      all: `
        WHERE 1`,
      id: `
        AND %s_id = ?`,
      etag: `
        AND %s = ?`,
      filter: {
        outer: `
          AND (%s)`,
        inner: '%s <> ?'
      }
    }
  }
};

export default class MysqlUpdate {
  changed(result) {
    return result.affectedRows > 0;
  }

  complex(path, data) {
    const query = sprintf(
      parts.link,
      '%(db)s',
      path[0],
      path[1]
    );

    return [query, data];
  }

  simple(path, data, ids, field, etag) {
    const name = path.join('_');

    let query = sprintf(parts.object.update, '%(db)s', name);
    const values = [];

    query += parts.object.set;
    values.push(data);

    query += parts.object.where.all;
    query += sprintf(parts.object.where.id, path[0]);
    values.push(ids.oid);

    query += sprintf(parts.object.where.id, path[1]);
    values.push(ids.cid);

    return this._etag(query, values, data, field, etag);
  }

  object(name, data, oid, field = null, etag = null) {
    let query = sprintf(parts.object.update, '%(db)s', name);
    const values = [];

    query += parts.object.set;
    values.push(data);

    query += parts.object.where.all;
    query += sprintf(parts.object.where.id, name);
    values.push(oid);

    return this._etag(query, values, data, field, etag);
  }

  _etag(query, values, data, field, etag) {
    if (field !== null && etag !== null) {
      query += sprintf(parts.object.where.etag, field);
      values.push(etag);
    }

    const filter = Object.keys(data).map((key) => {
      if (key === field) {
        return 1;
      }

      values.push(data[key]);
      return sprintf(parts.object.where.filter.inner, key);
    });

    query += sprintf(parts.object.where.filter.outer,
      filter.join(' OR '));

    return [query, values];
  }
}
