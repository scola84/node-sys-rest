/*eslint no-useless-escape: 0 */

import omit from 'lodash-es/omit';
import pick from 'lodash-es/pick';
import sprintf from 'sprintf';

const regexp = {
  interval: /([\[\(])([-+]?[0-9]*\.?[0-9]*);([-+]?[0-9]*\.?[0-9]*)([\)\]])/,
  like: /\*/
};

const parts = {
  list: {
    count: `
      SELECT COUNT(*) AS total FROM %s.%s l0`,
    select: `
      SELECT * FROM %s.%s l0`,
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
    limit: `
      LIMIT ?,?`
  },
  object: `
    SELECT *
    FROM %s.%s
    WHERE %s_id = ?`
};

export default class MysqlSelect {
  list(path, values, fields, operator) {
    const filter = omit(fields, ['count', 'offset']);
    const limit = pick(fields, ['count', 'offset']);
    const query = sprintf(parts.list.select, '%(db)s', path[0]);

    return this._list(query, path, values, filter, limit, operator);
  }

  object(name) {
    return sprintf(
      parts.object,
      '%(db)s',
      name,
      name
    );
  }

  total(path, values, fields, operator) {
    const filter = omit(fields, ['count', 'offset']);
    const query = sprintf(parts.list.count, '%(db)s', path[0]);

    return this._list(query, path, values, filter, null, operator);
  }

  _list(query, path, values, filter, limit = null, operator = 'and') {
    path.forEach((part, index) => {
      if (path[index + 1]) {
        query += sprintf(
          parts.list.join,
          '%(db)s',
          path[index + 1],
          part,
          index + 1,
          index,
          part,
          index + 1,
          part
        );
      } else {
        query += parts.list.where.all;

        if (index > 0) {
          query += sprintf(
            parts.list.where.id,
            index,
            part
          );
        }
      }
    });

    filter = this._filter(filter, values);

    if (filter.length > 0) {
      query += sprintf(
        parts.list.where.field.outer,
        filter.join(' ' + operator + ' ')
      );
    }

    if (limit !== null) {
      query += parts.list.limit;
      values.push(limit.offset);
      values.push(limit.count);
    }

    return [query, values];
  }

  _filter(filter, values) {
    return Object.keys(filter).map((field) => {
      const value = String(filter[field]);
      const interval = value.match(regexp.interval);

      if (interval) {
        return this._interval(interval, field, values);
      }

      const like = value.match(regexp.like);

      if (like) {
        return this._like(value, field, values);
      }

      return this._equal(value, field, values);
    });
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
}