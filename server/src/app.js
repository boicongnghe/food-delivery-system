import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import { handleSepayWebhook } from './controllers/paymentController.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Webhook SePay (Hỗ trợ URL ngrok tùy biến như /TourBuddy/webhook/sepay)
app.post('/TourBuddy/webhook/sepay', handleSepayWebhook);
app.post('/webhook/sepay', handleSepayWebhook);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
