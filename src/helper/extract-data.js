export default function extractData() {
  return (request, response, callback) => {
    const chunks = [];

    request.once('error', (error) => {
      request.removeAllListeners();
      callback(error);
    });

    request.on('data', (chunk) => {
      chunks.push(chunk);
    });

    request.once('end', () => {
      request.removeAllListeners();

      let data = null;

      if (chunks.length === 1) {
        data = chunks[0];
      } else if (Buffer.isBuffer(chunks[0]) === true) {
        data = Buffer.concat(chunks);
      } else {
        data = chunks.join('');
      }

      request.data(data);
      callback();
    });
  };
}
