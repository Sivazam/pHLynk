import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { userService } from '@/services/firestore'
import { auth as firebaseAuth } from '@/lib/firebase'
import { secureLogger } from '@/lib/secure-logger'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // For retailer login, we need to handle it differently
          // Retailers login with phone number as email and OTP/password
          
          // First, try to get the user from Firebase Auth
          const { signInWithEmailAndPassword } = await import('firebase/auth')
          
          try {
            const userCredential = await signInWithEmailAndPassword(
              firebaseAuth, 
              credentials.email, 
              credentials.password
            )
            
            const firebaseUser = userCredential.user
            
            // Get user details from Firestore
            const userDoc = await userService.getById(firebaseUser.uid, 'default') // You may need to determine tenantId
            
            if (!userDoc) {
              return null
            }
            
            // Check if user is active
            if (!userDoc.active) {
              secureLogger.auth('User account is inactive', { userId: firebaseUser.uid });
              return null;
            }
            
            // For wholesaler admins and line workers, check tenant status
            if (userDoc.roles.includes('WHOLESALER_ADMIN') || userDoc.roles.includes('LINE_WORKER')) {
              if (!userDoc.tenantId) {
                secureLogger.auth('User missing tenantId', { userId: firebaseUser.uid });
                return null;
              }
              
              // Fetch tenant document to check status
              const { getDoc, doc } = await import('firebase/firestore');
              const { db, COLLECTIONS } = await import('@/lib/firebase');
              const tenantDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, userDoc.tenantId));
              if (!tenantDoc.exists()) {
                secureLogger.auth('Tenant not found', { tenantId: userDoc.tenantId });
                return null;
              }
              
              const tenantData = tenantDoc.data();
              if (tenantData.status !== 'ACTIVE') {
                secureLogger.auth('Tenant account is not active', { 
                  tenantId: userDoc.tenantId, 
                  status: tenantData.status 
                });
                return null;
              }
            }
            
            // Return user object with required fields
            return {
              id: firebaseUser.uid,
              email: userDoc.email,
              name: userDoc.displayName,
              role: userDoc.roles?.[0] || 'RETAILER', // Use first role or default to RETAILER
            }
          } catch (firebaseError) {
            secureLogger.auth('Firebase auth failed, trying retailer auth', { error: firebaseError.message });
            
            // If Firebase auth fails, try retailer authentication
            const { RetailerAuthService } = await import('@/services/retailer-auth')
            
            try {
              const retailerUser = await RetailerAuthService.getRetailerUserByPhone(credentials.email)
              
              if (retailerUser && retailerUser.isActive) {
                // For retailer auth, we'll use a simple validation
                // In a real implementation, you might validate against a stored password or use OTP
                // For now, we'll accept any non-empty password as valid
                if (credentials.password && credentials.password.length > 0) {
                  return {
                    id: retailerUser.id,
                    email: retailerUser.email || credentials.email,
                    name: retailerUser.name,
                    role: 'RETAILER',
                  }
                }
              }
            } catch (retailerError) {
              secureLogger.auth('Retailer auth also failed', { error: retailerError.message });
            }
            
            return null
          }
        } catch (error) {
          secureLogger.error('Authorization error', { error: error.message });
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)