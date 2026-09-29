import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
  res.json({ message: 'WMA Wood Craft Backend API ay gumagana na nang maayos!' });
});

app.listen(PORT, () => {
  console.log(`Ang backend server ay tumatakbo sa http://localhost:${PORT}`);
});