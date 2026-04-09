import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ API routes MUST come BEFORE express.static
// Otherwise static middleware intercepts POST requests and returns a 404 HTML page,
// which the frontend then fails to parse as JSON.
app.post('/send-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, error: 'No email provided' });

  try {
    const result = await resend.emails.send({
      // onboarding@resend.dev only works when sending TO your own Resend account email.
      // Once you verify a domain in Resend, change this to: Quill <hello@yourdomain.com>
      from: 'Quill <onboarding@resend.dev>',
      to: email,
      subject: "You're on the Quill waitlist ✦",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f0e8;font-family:'Georgia',serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="background:#000033;padding:32px 40px;text-align:center;">
                    <p style="margin:0;"> 
                    <img src="quill-logo-email.svg" alt="Quill Logo" height="50"></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px 40px 32px;">
                    <p style="color:#c9a96e;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 16px;">You're in ✦</p>
                    <h1 style="color:#000033;font-size:26px;line-height:1.3;margin:0 0 20px;">Thank you for joining<br>the Quill waitlist.</h1>
                    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 24px;">
                      We're building a space for readers and writers who share a passion for the written word.
                      You'll be among the first to know when we open our doors.
                    </p>
                    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0;">Until then — keep reading. 📖</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 40px 32px;border-top:1px solid #ede7d9;">
                    <p style="color:#9ca3af;font-size:12px;margin:0;">© 2025 Quill · <a href="mailto:quillcoapp@gmail.com" style="color:#9ca3af;">quillcoapp@gmail.com</a></p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });
    console.log('Email sent:', result);
    res.json({ success: true });
  } catch (err) {
    console.error('Resend error:', JSON.stringify(err, null, 2));
    res.status(500).json({ success: false, error: err.message });
  }
});

// Static files come AFTER routes
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
