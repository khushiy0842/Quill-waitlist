import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google Sheets setup using Tanaike's approach
async function writeToSheet(data) {
  if (data.length === 0) {
    console.log("No data to write to the sheet.");
    return;
  }

  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(
    process.env.SPREADSHEET_ID,
    serviceAccountAuth
  );

  try {
    await doc.loadInfo(); // Loads document properties and worksheets
    const sheet = doc.sheetsByIndex[0]; // Access the first sheet

    // Batch adding rows to avoid hitting rate limits for large datasets
    await sheet.addRows(data); // Adds multiple rows at once if 'data' is an array of objects
    console.log("Data successfully written to the sheet.");
  } catch (error) {
    console.error("Failed to write data to the sheet:", error);
  }
}

// ✅ API routes MUST come BEFORE express.static
app.post('/send-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, error: 'No email provided' });

  try {
    // ✅ Use Resend template instead of hardcoded HTML
    const result = await resend.emails.send({
      from: 'Quill <hello@quillcoapp.com>',
      to: email,
      template: {
    id: "waitlist-confirmation",
  }, // Your template alias
    });
    
    console.log('Email sent:', result);
    
    // ✅ Add email to Google Sheets using Tanaike's approach
    await writeToSheet([
      [email, new Date().toISOString()]
    ]);
    
    console.log('Email added to Google Sheets');
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error:', JSON.stringify(err, null, 2));
    res.status(500).json({ success: false, error: err.message });
  }
});

// Static files come AFTER routes
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
