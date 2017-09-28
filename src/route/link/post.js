import { Validator } from '@scola/validator';
import WriteLinkRoute from './write';

const validator = new Validator();
validator.field('oid').cast().integer();

export default class PostLinkRoute extends WriteLinkRoute {
  start() {
    this._server
      .router()
      .post(
        '/' + this._config.name + '/:oid/:child',
        (rq, rs, n) => this._validatePath(rq, rs, n),
        (rq, rs, n) => this._validateData(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._authorizeUserObject(rq, rs, n),
        (rq, rs, n) => this._insert(rq, rs, n)
      )
      .extract();
  }

  _validatePath(request, response, next) {
    const child = request.param('child');

    if (this._config.simple.indexOf(child) === -1) {
      next(request.error('404 invalid_path'));
      return;
    }

    validator.validate(request.params(), next);
  }

  _validateData(request, response, next) {
    next();
  }

  _insert(request, response, next) {
    const params = request.params();
    const child = request.param('child');

    const path = [
      this._config.name,
      child
    ];

    const query = this._format
      .format('insert')
      .link(path);

    const data = Object.assign({}, request.data(), {
      [this._config.name + '_id']: params.oid
    });

    const values = this._filter(data);

    this._server
      .database()
      .connection(this._config.database)
      .query(query)
      .execute(values, (error, result) => {
        if (error) {
          next(request.error('500 invalid_query ' + error));
          return;
        }

        const id = this._format
          .format('insert')
          .id(result);

        response
          .header('x-id', id)
          .status(201)
          .end();
      });
  }
}
