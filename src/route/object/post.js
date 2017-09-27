import WriteObjectRoute from './write';

export default class PostObjectRoute extends WriteObjectRoute {
  start() {
    this._server
      .router()
      .post(
        '/' + this._config.name,
        (rq, rs, n) => this._validateData(rq, rs, n),
        (rq, rs, n) => this._authorizeRole(rq, rs, n),
        (rq, rs, n) => this._insert(rq, rs, n)
      )
      .extract();
  }

  _insert(request, response, next) {
    const query = this._format
      .format('insert')
      .object(this._config.name);

    const values = this._filter(request.data());

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
