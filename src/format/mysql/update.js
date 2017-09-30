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
  object: {
    update: `
      UPDATE %s.%s`,
    set: `
      SET ?`,
    where: {
      all: `
        WHERE %s_id = ?`,
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

  link(path, type) {
    return sprintf(
      parts.link[type],
      '%(db)s',
      path[0],
      path[1]
    );
  }

  object(name, data, oid, field = null, etag = null) {
    let query = sprintf(parts.object.update, '%(db)s', name);
    const values = [];

    query += parts.object.set;
    values.push(data);

    query += sprintf(parts.object.where.all, name);
    values.push(oid);

    if (field !== null && etag !== null) {
      query += sprintf(parts.object.where.etag, field);
      values.push(etag);
    }

    return this._etag(query, values, data, field);
  }

  _etag(query, values, data, field) {
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
