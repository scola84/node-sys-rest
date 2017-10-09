import AbstractAuth from './abstract';

export default class AuthBearer extends AbstractAuth {
  authenticate(request, next) {
    const header = request.header('Authorization', true);

    const [query, values] = this._format
      .format('auth')
      .bearer(header[1]);

    this._server
      .database()
      .connection(this._config.database)
      .query(query)
      .nest(true)
      .execute(values, (error, user) => {
        if (error) {
          next(request.error('500 invalid_query ' + error.message));
          return;
        }

        if (user.length === 0) {
          next(request.error('401 invalid_auth'));
          return;
        }

        request
          .connection()
          .user(this._user(user[0]));

        next();
      });
  }
}
