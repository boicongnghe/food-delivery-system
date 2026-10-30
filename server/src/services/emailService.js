import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const emailPort = Number(process.env.EMAIL_PORT) || 587;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailUser && emailPass) {
    transporter = nodemailer.createTransporter || nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  return transporter;
};

/**
 * Gửi email kích hoạt tài khoản cho người dùng
 */
export const sendVerificationEmail = async ({ email, fullName, token }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const verificationUrl = `${clientUrl}/verify-email?token=${token}`;
  const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"FoodDelivery System" <no-reply@fooddelivery.vn>';

  const mailTransporter = getTransporter();

  // Template HTML gửi mail hiện đại, sang trọng
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kích hoạt tài khoản FoodDelivery</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #F8FAFC; padding: 30px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;">
              
              <!-- Header Gradient Banner -->
              <tr>
                <td style="background: linear-gradient(135deg, #FF4B2B 0%, #FF416C 50%, #FF8008 100%); padding: 36px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                    Food<span style="color: #FFE600;">Delivery</span>
                  </h1>
                  <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500;">
                    Hệ thống đặt & giao đồ ăn trực tuyến
                  </p>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 36px 32px 28px 32px;">
                  <h2 style="margin: 0 0 16px 0; color: #0F172A; font-size: 20px; font-weight: 700;">
                    Xin chào ${fullName || 'bạn'}, 👋
                  </h2>
                  <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                    Cảm ơn bạn đã đăng ký tài khoản tại <strong>FoodDelivery</strong>. Để đảm bảo an toàn bảo mật và bắt đầu trải nghiệm dịch vụ đặt món, vui lòng xác nhận địa chỉ email của bạn.
                  </p>
                  
                  <!-- Action Button -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #FF4B2B 0%, #FF416C 100%); color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 34px; border-radius: 12px; box-shadow: 0 4px 15px rgba(255, 75, 43, 0.35);">
                      🚀 Kích hoạt tài khoản ngay
                    </a>
                  </div>

                  <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748B; line-height: 1.5;">
                    ⏳ <em>Đường link kích hoạt này có hiệu lực trong vòng <strong>24 giờ</strong>.</em>
                  </p>
                  
                  <div style="background-color: #F1F5F9; border-radius: 8px; padding: 12px; margin-top: 20px; word-break: break-all;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B;">
                      Nếu nút bấm ở trên không hoạt động, bạn có thể sao chép và dán liên kết bên dưới vào trình duyệt:
                    </p>
                    <a href="${verificationUrl}" target="_blank" style="font-size: 12px; color: #FF4B2B; text-decoration: underline;">
                      ${verificationUrl}
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; text-align: center;">
                  <p style="margin: 0 0 6px 0; font-size: 12px; color: #94A3B8;">
                    Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email này.
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #94A3B8; font-weight: 500;">
                    © ${new Date().getFullYear()} FoodDelivery System. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Nếu đã cấu hình SMTP email thật
  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: senderEmail,
        to: email,
        subject: '✨ [FoodDelivery] Xác nhận kích hoạt tài khoản của bạn',
        html: htmlContent,
      });
      console.log(`[EmailService] Verification email sent to: ${email}`);
      return { success: true, verificationUrl, isDevMode: false };
    } catch (error) {
      console.error('[EmailService] Failed to send email via SMTP, fallback to console log:', error.message);
    }
  }

  // Fallback Dev Mode (in ra terminal rõ ràng để test thuận tiện khi chưa cài SMTP)
  console.log('\n================================================================');
  console.log('📬 [EMAIL SERVICE - DEV MODE]');
  console.log(`Người nhận: ${fullName} <${email}>`);
  console.log(`Link kích hoạt tài khoản:`);
  console.log(`👉 ${verificationUrl}`);
  console.log('================================================================\n');

  return { success: true, verificationUrl, isDevMode: true };
};
