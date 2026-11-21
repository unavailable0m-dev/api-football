import handler from '../../src/handler.js';

export default async function api(request) {
  const headers = new Headers();
  let statusCode = 200;
  let body;
  const res = {
    get statusCode() { return statusCode; },
    set statusCode(value) { statusCode = value; },
    setHeader(name, value) { headers.set(name, String(value)); },
    end(value) { body = value; }
  };
  await handler({url:request.url, method:request.method}, res);
  return new Response(body, {status:statusCode, headers});
}

export const config = {path:'/api/*'};
