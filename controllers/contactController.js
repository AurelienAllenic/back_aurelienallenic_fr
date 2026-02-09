const brevo = require('@getbrevo/brevo');
const getMessageModel = require('../models/Message');
const { encrypt } = require('../utils/encryption');
const { verifyRecaptcha } = require('../utils/recaptcha');

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

/**
 * Gère l'envoi d'emails depuis le formulaire de contact
 */
exports.handleContact = async (req, res) => {
  const { email, message, captchaToken } = req.body;

  const siteName = process.env.SITE_NAME || 'Site';
  const senderEmail = process.env.SENDER_EMAIL || 'contact@example.com';
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SENDER_EMAIL || 'contact@example.com';
  const siteUrl = process.env.SITE_URL || process.env.FRONTEND_URL || 'https://example.com';
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

  if (!email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Email et message sont requis',
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: "Format d'email invalide",
    });
  }

  if (recaptchaSecret) {
    if (!captchaToken) {
      return res.status(400).json({
        success: false,
        error: 'Vérification de sécurité requise. Veuillez accepter les cookies et réessayer.',
      });
    }
    const verification = await verifyRecaptcha(captchaToken, recaptchaSecret, 'contact', 0.5);
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        error: 'Vérification de sécurité échouée. Veuillez réessayer.',
      });
    }
  }

  try {
    const adminEmailPayload = {
      sender: {
        email: senderEmail,
        name: `${siteName} - Formulaire de contact`,
      },
      to: [{ email: adminEmail }],
      replyTo: { email: email },
      subject: `[${siteName}] Nouveau message de contact`,
      htmlContent: `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nouveau message - ${siteName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    </head>
    <body style="margin:0; padding:0; background:#dde3e9; font-family:'Manrope', 'IBM Plex Sans', Arial, sans-serif; color:#5f6b77; line-height:1.6;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#dde3e9; padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" style="max-width:620px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 6px 24px rgba(47,52,59,0.08);">
              
              <!-- Header discret -->
              <tr>
                <td style="background: linear-gradient(to bottom, #dde3e9, #f8f9fa); padding:45px 30px; text-align:center;">
                  <h1 style="margin:0; font-family:'Space Grotesk', sans-serif; font-size:38px; font-weight:700; color:#2f343b; letter-spacing:-0.5px;">
                    ${siteName}
                  </h1>
                  <p style="margin:14px 0 0; font-size:17px; color:#5f6b77; font-weight:500;">
                    Nouveau message reçu
                  </p>
                </td>
              </tr>
              
              <!-- Contenu -->
              <tr>
                <td style="padding:40px 35px;">
                  <h2 style="margin:0 0 22px; font-family:'Space Grotesk', sans-serif; font-size:26px; font-weight:600; color:#2f343b;">
                    Informations du contact
                  </h2>
                  
                  <table width="100%" cellpadding="12" cellspacing="0" border="0" style="font-size:16px; color:#5f6b77; font-family:'IBM Plex Sans', sans-serif;">
                    <tr>
                      <td width="140" style="font-weight:600; color:#2f343b;">Email :</td>
                      <td><a href="mailto:${email}" style="color:#5f6b77; text-decoration:underline; font-weight:500;">${email}</a></td>
                    </tr>
                  </table>
                  
                  <h3 style="margin:38px 0 16px; font-family:'Space Grotesk', sans-serif; font-size:22px; font-weight:600; color:#2f343b;">
                    Message
                  </h3>
                  <div style="background:#f8f9fa; padding:28px; border-radius:10px; border:1px solid #e2e8f0; line-height:1.7; font-size:16px; color:#5f6b77; white-space:pre-wrap; font-family:'Manrope', sans-serif;">
                    ${message.replace(/\n/g, '<br>')}
                  </div>
                  
                  <!-- Bouton répondre – discret mais visible -->
                  <div style="text-align:center; margin:45px 0;">
                    <a href="mailto:${email}?subject=Re: Votre message sur ${siteName}" 
                      style="display:inline-block; background:#2f343b; color:#ffffff; padding:14px 38px; text-decoration:none; border-radius:8px; font-family:'Manrope', sans-serif; font-weight:600; font-size:16px; box-shadow:0 4px 12px rgba(47,52,59,0.15);">
                      ✉️ Répondre
                    </a>
                  </div>
                  
                  <p style="text-align:center; margin:30px 0 0; font-size:14px; color:#a9b0b8; font-family:'IBM Plex Sans', sans-serif;">
                    Reçu le ${new Date().toLocaleString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background:#f8f9fa; padding:28px; text-align:center; font-size:13px; color:#a9b0b8; border-top:1px solid #e2e8f0;">
                  © ${new Date().getFullYear()} ${siteName} – Tous droits réservés
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `,
    };

    await apiInstance.sendTransacEmail(adminEmailPayload);
    console.log(`✅ Email admin envoyé depuis ${email}`);

    const confirmationEmail = {
      sender: {
        email: senderEmail,
        name: siteName,
      },
      to: [{ email: email }],
      subject: 'Message bien reçu ! 🎨',
      htmlContent: `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Message bien reçu – ${siteName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
      </head>
      <body style="margin:0; padding:0; background:#dde3e9; font-family:'Manrope', 'IBM Plex Sans', Arial, sans-serif; color:#5f6b77; line-height:1.6;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#dde3e9; padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 6px 24px rgba(47,52,59,0.08);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(to bottom, #dde3e9, #f8f9fa); padding:50px 30px; text-align:center;">
                    <h1 style="margin:0; font-family:'Space Grotesk', sans-serif; font-size:42px; font-weight:700; color:#2f343b; letter-spacing:-0.8px;">
                      ${siteName}
                    </h1>
                    <p style="margin:16px 0 0; font-size:19px; font-weight:500; color:#5f6b77;">
                      Merci pour votre message !
                    </p>
                  </td>
                </tr>
                
                <!-- Contenu -->
                <tr>
                  <td style="padding:45px 35px;">
                    <h2 style="margin:0 0 24px; font-family:'Space Grotesk', sans-serif; font-size:28px; font-weight:600; color:#2f343b;">
                      Bonjour !
                    </h2>
                    
                    <p style="font-size:16px; line-height:1.8; color:#5f6b77; margin:0 0 32px;">
                      Nous avons bien reçu votre message et nous vous en remercions sincèrement.<br>
                      Notre équipe vous répondra dans les plus brefs délais.
                    </p>
                    
                    <h3 style="margin:35px 0 16px; font-family:'Space Grotesk', sans-serif; font-size:22px; font-weight:600; color:#2f343b;">
                      Votre message
                    </h3>
                    <div style="background:#f8f9fa; padding:28px; border-radius:10px; border:1px solid #e2e8f0; font-size:16px; line-height:1.7; color:#5f6b77; white-space:pre-wrap; font-family:'Manrope', sans-serif;">
                      ${message.replace(/\n/g, '<br>')}
                    </div>
                    
                    <p style="margin:38px 0 0; font-size:16px; line-height:1.8; color:#5f6b77;">
                      En attendant notre retour, n’hésitez pas à découvrir nos actualités sur<br>
                      <a href="${siteUrl}" style="color:#5f6b77; text-decoration:underline; font-weight:500;">${siteUrl.replace(/^https?:\/\//, '')}</a>
                    </p>
                    
                    <!-- Signature -->
                    <div style="text-align:center; margin:55px 0 20px;">
                      <p style="font-size:18px; font-weight:600; color:#2f343b; margin:0 0 8px; font-family:'Space Grotesk', sans-serif;">
                        À très bientôt
                      </p>
                      <p style="font-size:16px; color:#5f6b77; margin:0; font-family:'Manrope', sans-serif;">
                        L’équipe ${siteName}
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background:#f8f9fa; padding:30px; text-align:center; font-size:13px; color:#a9b0b8; border-top:1px solid #e2e8f0;">
                    © ${new Date().getFullYear()} ${siteName} – Tous droits réservés
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `,
    };

    await apiInstance.sendTransacEmail(confirmationEmail);
    console.log(`✅ Email confirmation envoyé à ${email}`);

    res.status(200).json({
      success: true,
      message: 'Votre message a été envoyé avec succès ! Nous vous répondrons rapidement.',
    });

    (async () => {
      try {
        const Message = await Promise.race([
          getMessageModel(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout récupération modèle')), 5000)),
        ]);

        if (Message) {
          const encryptedEmail = encrypt(email);
          const encryptedMessage = encrypt(message);
          const messageDoc = new Message({
            email: encryptedEmail,
            message: encryptedMessage,
            send: true,
          });
          await Promise.race([
            messageDoc.save(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout sauvegarde')), 3000)),
          ]);
          console.log(`✅ [Message] Message chiffré créé en BDD (ID: ${messageDoc._id})`);
        }
      } catch (error) {
        console.error('❌ [Message] Erreur création message:', error.message);
      }
    })();
  } catch (error) {
    console.error('❌ Erreur Brevo :', error);

    let errorMessage = error.message;
    if (error.response) {
      console.error('Détails:', error.response.body);
      errorMessage = JSON.stringify(error.response.body);
    }

    res.status(500).json({
      success: false,
      error: "Une erreur est survenue lors de l'envoi. Veuillez réessayer dans quelques instants.",
    });

    (async () => {
      try {
        const Message = await Promise.race([
          getMessageModel(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout récupération modèle')), 5000)),
        ]);

        if (Message) {
          const encryptedEmail = encrypt(email);
          const encryptedMessage = encrypt(message);
          const messageDoc = new Message({
            email: encryptedEmail,
            message: encryptedMessage,
            send: false,
            error: errorMessage,
          });
          await Promise.race([
            messageDoc.save(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout sauvegarde')), 3000)),
          ]);
          console.log(`❌ [Message] Message chiffré créé en BDD avec erreur (ID: ${messageDoc._id})`);
        }
      } catch (dbError) {
        console.error('❌ [Message] Erreur création message:', dbError.message);
      }
    })();
  }
};