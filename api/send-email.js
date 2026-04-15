import { Resend } from 'resend';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.addRows(data);
    console.log("Data successfully written to the sheet.");
  } catch (error) {
    console.error("Failed to write data to the sheet:", error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    // Send email via Resend
    const result = await resend.emails.send({
      from: 'Quill <hello@quillcoapp.com>',
      to: email,
      template: "waitlist-confirmation", // Make sure this template exists
    });
    
    console.log('Email sent:', result);
    
    // Write to Google Sheets
    await writeToSheet([
      [email, new Date().toISOString()]
    ]);
    
    return res.status(200).json({ 
      success: true,
      message: 'Email sent and recorded successfully'
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
