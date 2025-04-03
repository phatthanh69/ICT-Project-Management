const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // API Proxy
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5555',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api' // keep /api prefix when forwarding
      },
      onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).send('Proxy Error');
      }
    })
  );

  // Health check endpoint
  app.use(
    '/health',
    createProxyMiddleware({
      target: 'http://localhost:5555',
      changeOrigin: true
    })
  );
};
