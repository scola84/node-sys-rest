import {
  accessSync,
  createReadStream,
  constants
} from 'fs';

export default function transformFile() {
  return (request, response, next) => {
    try {
      accessSync(response.datum('data.path'), constants.R_OK);
    } catch (error) {
      next(request.error('500 invalid_path ' + error.message));
      return;
    }

    response
      .codec(false)
      .header('Content-Length', response.datum('data.size'))
      .header('Content-Type', response.datum('data.type'));

    createReadStream(response.datum('data.path')).pipe(response);
    next(true);
  };
}
