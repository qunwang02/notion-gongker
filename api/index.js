import health from './health.js';
import submit from './submit.js';

export default async function handler(req, res) {
  const path = req.url.split('/').pop().split('?')[0];
  
  if (path === 'health') {
    return health(req, res);
  } else if (path === 'submit') {
    return submit(req, res);
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
}
