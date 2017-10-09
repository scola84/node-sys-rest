import omit from 'lodash-es/omit';
import GetListRoute from './get';

export default class GetListByObjectRoute extends GetListRoute {
  start() {
    this._handler([
      (rq, rs, n) => this._validatePath(rq, rs, n),
      (rq, rs, n) => this._validateQuery(rq, rs, n)
    ], this._validate);

    this._handler([
      (rq, rs, n) => this._authenticateUser(rq, rs, n),
      (rq, rs, n) => this._authorizeRole(rq, rs, n),
      (rq, rs, n) => this._authorizeUser(rq, rs, n)
    ], this._authorize);

    this._handler([
      (rq, rs, n) => this._prepareSelect(rq, rs, n),
      (rq, rs, n) => this._selectTotal(rq, rs, n),
      (rq, rs, n) => this._selectList(rq, rs, n),
      (rq, rs, n) => this._transformData(rq, rs, n),
      (rq, rs, n) => this._sendResponse(rq, rs, n)
    ]);

    this._handler([
      (rq, rs, n) => this._subscribeRequest(rq, rs, n)
    ], this._subscribe);

    this._get('/' + this._config.name + '/:oid/:child');
  }

  _validatePath(request, response, next) {
    const child = request.param('child');

    const isChild =
      this._config.complex.indexOf(child) > -1 ||
      this._config.simple.indexOf(child) > -1;

    const isParent =
      this._config.parents.indexOf(child) > -1;

    if (isChild === false && isParent === false) {
      next(request.error('404 invalid_path'));
      return;
    }

    this._rest
      .validator()
      .validate(request.params(), next);
  }

  _validateQuery(request, response, next) {
    const child = request.param('child');

    if (this._validator === null) {
      next();
      return;
    }

    const validator = this._validator[child];

    if (typeof validator === 'undefined') {
      next();
      return;
    }

    validator.validate(request.query(), next);
  }

  _authorizeRole(request, response, next) {
    const user = request.connection().user();

    if (user.may(this._config.name + '.read') === false) {
      next(request.error('403 invalid_auth'));
      return;
    }

    next();
  }

  _authorizeUser(request, response, next) {
    const user = request.connection().user();
    const name = this._config.name;
    const id = request.param('oid');

    this._authorizeRequest(user, name, id, (error) => {
      if (error) {
        next(request.error('403 invalid_auth'));
        return;
      }

      next();
    });
  }

  _prepareSelect(request, response, next) {
    const child = request.param('child');

    let path = [child, this._config.name];
    const values = [request.param('oid')];

    if (this._config.simple.indexOf(child) > -1) {
      path = [path.reverse().join('_'), null];
    }

    if (this._config.parents.indexOf(child) > -1) {
      path.reversed = true;
    }

    request.datum('path', path);
    request.datum('values', values);

    next();
  }

  _handlePubsub(event) {
    const cancel =
      typeof event.meta.oid === 'undefined' ||
      typeof event.meta.child === 'undefined';

    if (cancel === true) {
      return;
    }

    super._handlePubsub(event);
  }

  _publishChange(event) {
    this._server
      .pubsub()
      .fanout([
        '',
        this._config.name,
        event.meta.oid,
        event.meta.child
      ].join('/'))
      .publish(omit(event, 'data'));
  }
}
