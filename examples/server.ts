import express, { Request, Response } from 'express';
import { join } from 'path';
import cacheFile from '../src';

let app = express();

// blacklist
let rejectFile = (req: Request, res: Response) => {
  res.status(403).end(`${req.method} ${req.originalUrl} 403 Forbidden`);
};
app.use('/*.gitignore', rejectFile);
app.use('/*.git/*', rejectFile);

// serve static files
let root = join(__dirname, 'public');
app.use(
  cacheFile(root, {
    cacheSize: '50mb',
    update: {
      expire: '5 seconds',
      mode: 'cache_first',
    },
  }),
);

// apis
app.get('/user', (req, res) => res.json({ type: 'from api' }));
app.get('/user/:id', (req, res) =>
  res.json({ params: req.params, query: req.query }),
);

let port = process.env.PORT || 8100;
app.listen(port, () => {
  console.log('listening on http://localhost:' + port);
});
