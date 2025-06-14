# Email Configuration Setup for 2FA

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication on your Google Account**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and your device
   - Copy the generated 16-character password

3. **Update Environment Variables**
   Create a `.env` file in the backend directory with:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```

## Alternative Email Providers

### Outlook/Hotmail
```
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### Yahoo Mail
```
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

## Testing Email Configuration

1. Start the backend server
2. Try logging in with a user account
3. Check if OTP email is received
4. Check backend logs for any email sending errors

## Troubleshooting

- **"Invalid login" error**: Make sure you're using an app password, not your regular password
- **"Connection timeout"**: Check your firewall settings
- **"Authentication failed"**: Verify your email and app password are correct
- **No email received**: Check spam folder, verify email address is correct

## Security Notes

- Never commit your `.env` file to version control
- Use app passwords instead of regular passwords
- Consider using environment-specific email accounts for development/testing 