/*eslint no-useless-escape: 0 */

import sprintf from 'sprintf';

const regexp = {
  interval: /([\[\(])([-+]?[0-9]*\.?[0-9]*);([-+]?[0-9]*\.?[0-9]*)([\)\]])/,
  like: /\*/
};

const parts = {
  link: `
    SELECT *
    FROM %s.%s_%s
    WHERE %s_id = ?`,
  object: `
    SELECT *
    FROM %s.%s
    WHERE %s_id = ?`,
  list: {
    count: `
      SELECT COUNT(*) AS total FROM %s.%s l0`,
    select: `
      SELECT l0.* FROM %s.%s l0`,
    join: `
       INNER JOIN %s.link_%s_%s l%s ON l%s.%s_id = l%s.%s_id`,
    where: {
      all: `
        WHERE 1`,
      id: `
        AND l%s.%s_id IN (?)`,
      field: {
        outer: `
          AND (%s)`,
        inner: 'l0.%s %s ?'
      }
    },
    order: {
      all: `
        ORDER BY`,
      field: {
        asc: `
          ?? ASC`,
        desc: `
          ?? DESC`,
        sigasc: `
          CAST(?? AS SIGNED) ASC`,
        sigdesc: `
          CAST(?? AS SIGNED) DESC`
      }
    },
    limit: `
      LIMIT ?,?`
  }
};

export default class MysqlSelect {
  link(path, id) {
    const query = sprintf(
      parts.link,
      '%(db)s',
      path[0],
      path[1],
      path[1]
    );

    return [query, id];
  }

  object(name, id) {
    const query = sprintf(
      parts.object,
      '%(db)s',
      name,
      name
    );

    return [query, id];
  }

  list(path, values, { f, o, l }, operator) {
    const query = sprintf(parts.list.select, '%(db)s', path[0]);
    return this._list(query, path, values, { f, o, l }, operator);
  }

  total(path, values, { f }, operator) {
    const query = sprintf(parts.list.count, '%(db)s', path[0]);
    return this._list(query, path, values, { f }, operator);
  }

  _list(query, path, values, { f, l, o }, operator = 'and') {
    [query] = this._path(query, path);

    if (f) {
      [query, values] = this._filter(query, values, f, operator);
    }

    if (o) {
      [query, values] = this._order(query, values, o);
    }

    if (l) {
      [query, values] = this._limit(query, values, l);
    }

    return [query, values];
  }

  _path(query, path) {
    path.forEach((part, index) => {
      if (path[index + 1]) {
        query += this._join(path, index);
      } else if (path[index]) {
        query += this._complex(path, index);
      } else {
        query += this._simple(path, index);
      }
    });

    return [query];
  }

  _join(path, index) {
    return sprintf(
      parts.list.join,
      '%(db)s',
      path[index + (path.reversed ? 0 : 1)],
      path[index + (path.reversed ? 1 : 0)],
      index + 1,
      index,
      path[index],
      index + 1,
      path[index]
    );
  }

  _complex(path, index) {
    let complex = parts.list.where.all;

    if (index > 0) {
      complex += sprintf(
        parts.list.where.id,
        index,
        path[index]
      );
    }

    return complex;
  }

  _simple(path, index) {
    return sprintf(
      parts.list.where.id,
      index - 1,
      path[index - 1].split('_').shift()
    );
  }

  _filter(query, values, filter, operator) {
    filter = Object.keys(filter).map((field) => {
      const value = String(filter[field]);
      const interval = value.match(regexp.interval);
      const like = value.match(regexp.like);

      if (interval) {
        return this._interval(interval, field, values);
      }

      if (like) {
        return this._like(value, field, values);
      }

      return this._equal(value, field, values);
    });

    if (filter.length > 0) {
      query += sprintf(
        parts.list.where.field.outer,
        filter.join(' ' + operator + ' ')
      );
    }

    return [query, values];
  }

  _interval(interval, field, values) {
    const intervals = [];

    if (interval[2]) {
      intervals.push(sprintf(parts.list.where.field.inner,
        field, interval[1] === '[' ? '>=' : '>'));
      values.push(interval[2]);
    }

    if (interval[3]) {
      intervals.push(sprintf(parts.list.where.field.inner,
        field, interval[4] === ']' ? '<=' : '<'));
      values.push(interval[3]);
    }

    return '(' + intervals.join(' AND ') + ')';
  }

  _like(value, field, values) {
    values.push(value.replace(regexp.like, '%'));
    return sprintf(parts.list.where.field.inner, field, 'LIKE');
  }

  _equal(value, field, values) {
    values.push(value);
    return sprintf(parts.list.where.field.inner, field, '=');
  }

  _order(query, values, order) {
    if (typeof order.col === 'string') {
      order.col = [order.col];
      order.dir = [order.dir];
    }

    order = order.dir.map((dir, index) => {
      values.push(order.col[index]);
      return parts.list.order.field[dir];
    });

    if (order.length > 0) {
      query += parts.list.order.all;
      query += order.join(',');
    }

    return [query, values];
  }

  _limit(query, values, limit) {
    query += parts.list.limit;
    values.push(limit.off);
    values.push(limit.cnt);

    return [query, values];
  }
}
