import express from 'express';
import cors, { type CorsOptions } from 'cors';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import cartRoutes from './routes/cart.routes.js';
import inquiryRoutes from './routes/inquiry.routes.js';
import orderRoutes from './routes/order.routes.js';
import productsRoutes from './routes/products.routes.js';

const app = express();

const allowedOrigins = [
  'https://wma-wma3.vercel.app',
  /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app$/i,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i,
  /^http:\/\/192\.168\.\d+\.\d+:5173$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:5173$/,
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some((allowedOrigin) =>
      typeof allowedOrigin === 'string'
        ? allowedOrigin === origin
        : allowedOrigin.test(origin)
    );

    if (isAllowed) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/admin', adminRoutes);
app.use('/api', productsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/orders', orderRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'The requested endpoint was not found.' });
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'Image must be 1.5 MB or smaller.' });
    return;
  }
  if (error?.message === 'Only image files are allowed.') {
    res.status(400).json({ error: 'Upload a valid image file.' });
    return;
  }
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    res.status(400).json({ error: 'The request body contains invalid JSON.' });
    return;
  }
  if (error?.message?.startsWith('CORS blocked for origin:')) {
    res.status(403).json({ error: 'This request is not permitted from this origin.' });
    return;
  }

  console.error('Unhandled API error:', error);
  res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
