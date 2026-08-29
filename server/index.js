import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ivrRoutes from './routes/ivr.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Twilio and Exotel usually send data as application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.use('/api/ivr', ivrRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Maulinondh IVR Webhook Server' });
});

app.listen(PORT, () => {
  console.log(`IVR Webhook Server running on port ${PORT}`);
  console.log(`Configured Provider: ${process.env.IVR_PROVIDER || 'twilio'}`);
});
