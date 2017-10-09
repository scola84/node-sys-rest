import { createWriteStream, accessSync, constants } from 'fs';
import { extension } from 'mime-types';
import mkdirp from 'mkdirp';

export default function extractFile(options = {}) {
  return (request, response, next) => {
    const type = request.header('Content-Type') ||
      'application/octet-stream';

    let size = 0;
    const base = options.base + request.path();

    const file = [
      Date.now(),
      extension(type) || 'bin'
    ].join('.');

    const path = [
      base,
      file
    ].join('/');

    try {
      mkdirp.sync(base);
      accessSync(base, constants.W_OK);
    } catch (error) {
      next(request.error('500 invalid_path ' + error.message));
      return;
    }

    request
      .codec(false)
      .pipe(createWriteStream(path));

    request.on('data', (chunk) => {
      size += chunk.length;
    });

    request.once('end', () => {
      request.data({
        path,
        size,
        type
      });

      request.removeAllListeners();
      next();
    });

    request.once('error', (error) => {
      request.removeAllListeners();
      next(error);
    });
  };
}
