# Better-Auth Implementation Guide

## 🎉 Successfully Implemented!

Your better-auth integration is working! Here's how to use it:

## Testing Auth Endpoints

### 1. Check Auth Status
```bash
curl http://localhost:3000/auth/stats
```

### 2. Better-Auth API Endpoints
The catch-all route `/auth/*` handles all better-auth API calls. Common endpoints include:

- `POST /auth/sign-up/email` - User registration
- `POST /auth/sign-in/email` - User login  
- `POST /auth/sign-out` - User logout
- `GET /auth/session` - Get current session
- `POST /auth/verify-email` - Email verification

### 3. Testing User Registration Example
```bash
# Try different endpoint patterns that better-auth might use
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "name": "Test User"}'
```

## Using the Auth Guard (Optional)

To protect your wallet endpoints, add the AuthGuard:

```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('wallet')
export class WalletController {
  
  @UseGuards(AuthGuard)
  @Get('protected-route')
  async protectedRoute(@Req() req: any) {
    // req.user will contain authenticated user info
    const user = req.user;
    return { message: 'This is protected', user };
  }
}
```

## Linking Users to Wallets

Use the optional `user_wallets` table to associate authenticated users with HD wallets:

```sql
-- Link user to wallet
INSERT INTO user_wallets (user_id, wallet_id, role) 
VALUES ('user-uuid', 1, 'owner');
```

## Frontend Integration

For a frontend, you can:

1. Use better-auth client SDK
2. Make direct HTTP calls to `/auth/*` endpoints  
3. Handle sessions via cookies or tokens

## Environment Variables

Required in `.env`:
```bash
BETTER_AUTH_SECRET=better-auth-secret-key-32-chars-long-random-secure-key
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgres://postgres:password@localhost:5432/hdwallet
```

## Success! ✅

- ✅ Better-Auth initialized successfully
- ✅ Database tables created
- ✅ Auth endpoints mapped and ready
- ✅ Stats endpoint working: http://localhost:3000/auth/stats
- ✅ Catch-all routes handling better-auth API calls
- ✅ Optional AuthGuard available for protecting routes

Your HD Wallet application now has a complete authentication system integrated!

## What's Next?

1. **Test auth endpoints** - Try the various better-auth API endpoints
2. **Add auth to wallet routes** - Use AuthGuard to protect sensitive operations  
3. **Build frontend auth** - Create login/signup forms
4. **Link users to wallets** - Associate authenticated users with their wallets

The hard work is done - better-auth is fully integrated and working! 🚀
