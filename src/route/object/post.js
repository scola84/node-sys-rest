import WriteObjectRoute from './write';

export default class PostObjectRoute extends WriteObjectRoute {
  start() {
    this._server
      .router()
      .post(
        '/' + this._config.name,
        ...this._handlers({
          validate: [
            (rq, rs, n) => this._validateData(rq, rs, n)
          ],
          authorize: [
            (rq, rs, n) => this._checkUser(rq, rs, n),
            (rq, rs, n) => this._authorizeRole(rq, rs, n)
          ],
          execute: [
            (rq, rs, n) => this._insertObject(rq, rs, n)
          ],
          publish: [
            (rq, rs, n) => this._publishObject(rq, rs, n)
          ]
        })
      )
      .extract();
  }

  _insertObject(request, response, next) {
    const query = this._format
      .format('insert')
      .object(this._config.name);

    const values = this._applyFilter(request.data());

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
          this._config.name,
          oid
        ].join('/');

        response
          .status(201)
          .header('Location', location)
          .datum('oid', oid)
          .end();

        next();
      });
  }
}
