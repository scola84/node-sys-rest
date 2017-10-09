import { compare } from 'bcrypt';
import AbstractAuth from './abstract';

export default class AuthBasic extends AbstractAuth {
  authenticate(request, next) {
    const header = request.header('Authorization', true);

    const credentials = Buffer
      .from(header[1], 'base64')
      .toString()
      .split(':');

    const [query, values] = this._format
      .format('auth')
      .basic(credentials);

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

        user = user[0];

        compare(credentials[1], user.ub.password, (berror, bresult) => {
          if (berror) {
            next(request.error('401 invalid_auth'));
            return;
          }

          if (bresult === false) {
            next(request.error('401 invalid_auth'));
            return;
          }

          request
            .connection()
            .user(this._user(user));

          next();
        });
      });
  }
}
