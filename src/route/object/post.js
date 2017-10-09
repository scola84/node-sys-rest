import WriteObjectRoute from './write';

export default class PostObjectRoute extends WriteObjectRoute {

  start() {
    this._handler([
      (rq, rs, n) => this._authenticateUser(rq, rs, n),
      (rq, rs, n) => this._authorizeRole(rq, rs, n)
    ], this._authorize);

    this._handler([
      (rq, rs, n) => this._extractData(rq, rs, n),
      (rq, rs, n) => this._transformData(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._validateData(rq, rs, n)
    ], this._validate);

    this._handler([
      (rq, rs, n) => this._insertObject(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._publishObject(rq, rs, n)
    ], this._publish);

    this._post('/' + this._config.name);
  }

  _insertObject(request, response, next) {
    const query = this._format
      .format('insert')
      .object(this._config.name);

    const values = request.data();

    this._server
      .database()
      .connection(this._config.database)
      .query(query)
      .execute(values, (error, result) => {
        if (error) {
          next(request.error('500 invalid_query ' + error));
          return;
        }

        const oid = this._format
          .format('insert')
          .id(result);

        const location = [
          '',
          this._config.name,
          oid
        ].join('/');

        request.data(values);

        response
          .status(201)
          .header('Location', location)
          .datum('oid', oid)
          .end();

        next();
      });
  }
}
