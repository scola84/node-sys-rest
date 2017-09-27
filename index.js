import Rest from './src/rest';

import DeleteLinkRoute from './src/route/link/delete';
import PutLinkRoute from './src/route/link/put';

import GetListByParentRoute from './src/route/list/get-by-parent';
import GetListByUserParentRoute from './src/route/list/get-by-user-parent';
import GetListByUserRoute from './src/route/list/get-by-user';
import GetListRoute from './src/route/list/get';

import DeleteObjectRoute from './src/route/object/delete';
import GetObjectRoute from './src/route/object/get';
import PostObjectRoute from './src/route/object/post';
import PutObjectRoute from './src/route/object/put';

export {
  Rest,
  DeleteLinkRoute,
  PutLinkRoute,
  GetListByParentRoute,
  GetListByUserParentRoute,
  GetListByUserRoute,
  GetListRoute,
  DeleteObjectRoute,
  GetObjectRoute,
  PostObjectRoute,
  PutObjectRoute
};
