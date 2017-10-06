import omit from 'lodash-es/omit';
import GetListRoute from './get';

export default class GetListByUserRoute extends GetListRoute {
  start() {
    this._server
      .router()
      .get(
        '/my/' + this._config.name,
        ...this._handlers({
          validate: [
            (rq, rs, n) => this._validateQuery(rq, rs, n)
          ],
          authorize: [
            (rq, rs, n) => this._checkUser(rq, rs, n),
            (rq, rs, n) => this._authorizeRole(rq, rs, n)
          ],
          execute: [
            (rq, rs, n) => this._prepareSelect(rq, rs, n),
            (rq, rs, n) => this._selectTotal(rq, rs, n),
            (rq, rs, n) => this._selectList(rq, rs, n),
            (rq, rs, n) => this._sendResponse(rq, rs, n)
          ],
          subscribe: [
            (rq, rs, n) => this._subscribeRequest(rq, rs, n)
          ]
        })
      );
  }

  _authorizeRole(request, response, next) {
    const user = request.connection().user();

    if (user.may(this._config.name + '.read') === false) {
      next(request.error('403 invalid_auth'));
      return;
    }

    next();
  }

  _prepareSelect(request, response, next) {
    const path = [this._config.name, 'user'];

    if (this._config.complex.indexOf('user') > -1) {
      path.reversed = true;
    }

    request.datum('path', path);
    request.datum('values', [request.uid()]);

    next();
  }

  _handlePubsub(event) {
    const cachePath = [
      '',
      this._config.name
    ].join('/');

    const pubsubPath = [
      '',
      'my',
      this._config.name
    ].join('/');

    this._server
      .cache()
      .invalidate(cachePath);

    this._server
      .pubsub()
      .fanout(pubsubPath)
      .publish(omit(event, 'data'));
  }
}
