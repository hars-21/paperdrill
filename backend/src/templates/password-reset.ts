export const passwordResetTemplate = (name: string, resetUrl: string) => `<!DOCTYPE html
    PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">

<head>
    <meta content="width=device-width" name="viewport" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
</head>

<body dir="ltr" lang="en"
    style="background-color:#f5f5f7;padding-top:0;padding-bottom:0;padding-right:0;padding-left:0">
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
        <tbody>
            <tr>
                <td dir="ltr" lang="en"
                    style="font-family:-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;font-size:1em;line-height:155%;background-color:#f5f5f7;padding-top:40px;padding-right:20px;padding-bottom:40px;padding-left:20px;color:#3f3f46">
                    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"
                        style="max-width:560px;background-color:#ffffff;width:100%;border-radius:16px;line-height:155%">
                        <tbody>
                            <tr>
                                <td style="padding-top:48px;padding-right:40px;padding-bottom:48px;padding-left:40px">
                                    <h1
                                        style="margin:0;padding:0;font-size:28px;line-height:1.2;padding-top:0.389em;font-weight:700;color:#18181b;margin-top:0px;margin-bottom:16px;letter-spacing:-0.5px;text-align:left">
                                        Reset your password
                                    </h1>
                                    <p
                                        style="margin:0;padding:0;font-size:16px;line-height:1.6;color:#52525b;margin-top:0px;margin-bottom:12px;text-align:left">
                                        Hi ${name},
                                    </p>
                                    <p
                                        style="margin:0;padding:0;font-size:16px;line-height:1.6;color:#52525b;margin-top:0px;margin-bottom:32px;text-align:left">
                                        Use the link below to choose a new password for your PaperDrill account.
                                    </p>
                                    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                                        role="presentation">
                                        <tbody>
                                            <tr>
                                                <td align="left">
                                                    <a href="${resetUrl}"
                                                        style="line-height:100%;text-decoration:none;display:inline-block;max-width:100%;margin:0;padding:14px 28px;background-color:#E11D48;color:#ffffff;border-radius:10px;font-weight:600;font-size:15px;text-align:center;box-sizing:border-box"
                                                        target="_blank">Reset password</a>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <p
                                        style="margin:0;padding:0;font-size:14px;color:#71717a;margin-top:32px;margin-bottom:8px;line-height:1.6;text-align:left">
                                        Or copy and paste this link into your browser:
                                    </p>
                                    <p
                                        style="margin:0;padding:0;font-size:13px;margin-top:0px;margin-bottom:32px;word-break:break-all;line-height:1.5;text-align:left">
                                        <a href="${resetUrl}" rel="noopener noreferrer nofollow"
                                            style="color:#E11D48;text-decoration-line:none;text-decoration:underline"
                                            target="_blank">${resetUrl}</a>
                                    </p>
                                    <hr
                                        style="width:100%;border:none;border-top:1px solid #e4e4e7;margin-top:8px;margin-bottom:24px" />
                                    <p
                                        style="margin:0;padding:0;font-size:13px;color:#a1a1aa;margin-top:0px;margin-bottom:8px;line-height:1.6;text-align:left">
                                        This link expires in 1 hour and can only be used once.
                                    </p>
                                    <p
                                        style="margin:0;padding:0;font-size:13px;color:#a1a1aa;margin-top:0px;margin-bottom:24px;line-height:1.6;text-align:left">
                                        If you did not request a password reset, you can safely ignore this email.
                                    </p>
                                    <p
                                        style="margin:0;padding:0;font-size:12px;color:#a1a1aa;margin-top:0px;margin-bottom:0px;text-align:left">
                                        © 2026 PaperDrill. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>
</body>

</html>`;
