// Local Server & Vite Setup
if (!process.env.NETLIFY && !process.env.LAMBDA_TASK_ROOT) {
  const init = async () => {
    if (process.env.NODE_ENV !== "production") {
      try {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          server: { 
            middlewareMode: true,
            allowedHosts: true
          },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } catch (e) {
        console.warn('Vite not found or failed to load, skipping middleware');
      }
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api/')) {
          res.sendFile(path.join(distPath, 'index.html'));
        }
      });
    }

    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  };
  init().catch(console.error);
}
