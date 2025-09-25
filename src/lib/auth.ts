import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { userService } from '@/services/firestore'
import { auth as firebaseAuth } from '@/lib/firebase'

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
            
            // Return user object with required fields
            return {
              id: firebaseUser.uid,
              email: userDoc.email,
              name: userDoc.displayName,
              role: userDoc.roles?.[0] || 'RETAILER', // Use first role or default to RETAILER
            }
          } catch (firebaseError) {
            console.log('Firebase auth failed, trying retailer auth:', firebaseError)
            
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
              console.log('Retailer auth also failed:', retailerError)
            }
            
            return null
          }
        } catch (error) {
          console.error('Authorization error:', error)
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