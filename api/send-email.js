import { Resend } from 'resend';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const resend = new Resend(process.env.RESEND_API_KEY);

const submittedEmails = new Set();

async function writeToSheet(email) {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  await sheet.addRows([{ email, date: new Date().toISOString() }]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' });
  }

  if (submittedEmails.has(email)) {
    return res.status(409).json({ success: false, error: 'Email already registered' });
  }

  try {
    await resend.emails.send({
      from: 'Quill <hello@quillcoapp.com>',
      to: email,
      template: {
    id: 'waitlist-confirmation',
  },
    });

    console.log('Email sent to:', email);

    try {
      await writeToSheet(email);
      console.log('Email written to Google Sheets:', email);
    } catch (sheetErr) {
      // Log but don't fail the request — email was already sent successfully
      console.error('Google Sheets write failed:', sheetErr);
    }

    submittedEmails.add(email);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Resend error:', JSON.stringify(err, null, 2));
    return res.status(500).json({ success: false, error: err.message });
  }
}