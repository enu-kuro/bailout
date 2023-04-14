import dotenv from 'dotenv';
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

dotenv.config();

// console.log(process.env.CLIENT_ID);
// console.log(process.env.CLIENT_SECRET);
const oAuth2Client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'postmessage',
);

app.post('/auth/google', async (req, res) => {
  const { tokens } = await oAuth2Client.getToken(req.body.code);
  // console.log(tokens);
  res.json(tokens);
});

app.listen(3001, () => console.log(`server is running`));
