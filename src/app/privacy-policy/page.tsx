'use client';

import { Shield, Lock, Eye, Database, Globe, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Image 
                  src="/logo.png" 
                  alt="PharmaLync" 
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold text-gray-900">PharmaLync</span>
              </Link>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/faq" className="text-gray-600 hover:text-gray-900">FAQ</Link>
              <Link href="/privacy-policy" className="text-blue-600 font-medium">Privacy Policy</Link>
              <Link href="/terms-of-use" className="text-gray-600 hover:text-gray-900">Terms of Use</Link>
              <Link href="/help-center" className="text-gray-600 hover:text-gray-900">Help Center</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl text-blue-100">
            Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
          </p>
          <p className="text-blue-200 mt-2">Last updated: January 2025</p>
        </div>
      </div>

      {/* Privacy Policy Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          
          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Eye className="h-6 w-6 mr-3 text-blue-600" />
              Introduction
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              PharmaLync ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our pharmaceutical supply chain payment collection system (the "Service").
            </p>
            <p className="text-gray-600 leading-relaxed">
              By using our Service, you agree to the collection and use of information in accordance with this policy. This policy applies to all users of the Service, including Super Admins, Wholesaler Admins, Line Workers, and Retailers.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Database className="h-6 w-6 mr-3 text-green-600" />
              Information We Collect
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Information</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Full name and contact information (email address, phone number)</li>
                  <li>Business information (company name, business address)</li>
                  <li>User authentication credentials (encrypted passwords)</li>
                  <li>Government-issued identification (for verification purposes)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Transaction Data</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Invoice details (medicine names, quantities, amounts)</li>
                  <li>Payment information (amounts, dates, payment methods)</li>
                  <li>Outstanding balances and payment history</li>
                  <li>Retailer store information and location data</li>
                  <li>Geographic area assignments for line workers</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Technical Information</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage data (pages visited, time spent, features used)</li>
                  <li>Location data (for area-based assignments and field operations)</li>
                  <li>System-generated logs and audit trails</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Globe className="h-6 w-6 mr-3 text-purple-600" />
              How We Use Your Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Service Provision</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Provide and maintain the Service</li>
                  <li>• Process payments and transactions</li>
                  <li>• Generate invoices and receipts</li>
                  <li>• Send notifications and updates</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Account Management</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Create and manage user accounts</li>
                  <li>• Verify user identities</li>
                  <li>• Manage access permissions</li>
                  <li>• Provide customer support</li>
                </ul>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Security & Compliance</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Prevent fraud and unauthorized access</li>
                  <li>• Maintain audit trails</li>
                  <li>• Comply with legal requirements</li>
                  <li>• Protect user rights and safety</li>
                </ul>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Service Improvement</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Analyze usage patterns</li>
                  <li>• Improve user experience</li>
                  <li>• Develop new features</li>
                  <li>• Optimize system performance</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Sharing & Disclosure */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Lock className="h-6 w-6 mr-3 text-red-600" />
              Data Sharing & Disclosure
            </h2>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-600 mb-4">
                We do not sell, rent, or trade your personal information. We only share your data in the following circumstances:
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">With Your Consent</h4>
                    <p className="text-sm text-gray-600">We share information when you explicitly authorize us to do so.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Service Providers</h4>
                    <p className="text-sm text-gray-600">We share data with trusted third-party service providers who assist in operating our Service, subject to strict confidentiality agreements.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Legal Requirements</h4>
                    <p className="text-sm text-gray-600">We may disclose information when required by law, regulation, or legal process.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Business Transfers</h4>
                    <p className="text-sm text-gray-600">Information may be transferred in connection with a merger, acquisition, or sale of company assets.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="h-6 w-6 mr-3 text-indigo-600" />
              Data Security
            </h2>
            
            <div className="space-y-4 text-gray-600">
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These include:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Technical Security</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Encryption of data in transit and at rest</li>
                    <li>• Secure authentication mechanisms</li>
                    <li>• Regular security audits and testing</li>
                    <li>• Intrusion detection and prevention</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Organizational Security</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Employee training and awareness</li>
                    <li>• Access controls and permissions</li>
                    <li>• Confidentiality agreements</li>
                    <li>• Incident response procedures</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Data Retention */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-6 w-6 mr-3 text-teal-600" />
              Data Retention
            </h2>
            
            <div className="text-gray-600 space-y-4">
              <p>
                We retain your personal information only as long as necessary to fulfill the purposes for which it was collected, including:
              </p>
              
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>For the duration of your active account</li>
                <li>As required by law or regulatory obligations</li>
                <li>To maintain audit trails and compliance records</li>
                <li>To resolve disputes and enforce agreements</li>
                <li>For legitimate business interests with appropriate safeguards</li>
              </ul>
              
              <p>
                Upon account termination, we will delete or anonymize your personal information, except where retention is required by law or necessary for legitimate business purposes.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Mail className="h-6 w-6 mr-3 text-yellow-600" />
              Your Rights
            </h2>
            
            <div className="bg-yellow-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">
                You have the following rights regarding your personal information:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Access & Portability</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Request access to your data</li>
                    <li>• Obtain copies of your information</li>
                    <li>• Request data portability</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Correction & Deletion</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Correct inaccurate information</li>
                    <li>• Request deletion of your data</li>
                    <li>• Restrict processing of your data</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Control & Objection</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Object to processing</li>
                    <li>• Withdraw consent</li>
                    <li>• Opt-out of marketing</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Complaint & Redress</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• File complaints with authorities</li>
                    <li>• Seek judicial remedies</li>
                    <li>• Report privacy concerns</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Phone className="h-6 w-6 mr-3 text-blue-600" />
              Contact Us
            </h2>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-600 mb-4">
                If you have any questions about this Privacy Policy or how we handle your personal information, please contact us:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Email</p>
                    <p className="text-gray-600">privacy@pharmalynk.com</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Phone</p>
                    <p className="text-gray-600">+91 9014882779</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Address</p>
                    <p className="text-gray-600">123 Business Park, Chennai, India</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Website</p>
                    <p className="text-gray-600">www.pharmalynk.com</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Policy Updates */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Policy Updates</h2>
            <p className="text-gray-600">
              We may update this Privacy Policy from time to time. The updated version will be indicated by a revised "Last updated" date and will take effect immediately upon posting. We encourage you to review this policy periodically for any changes.
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Image 
                  src="/logo.png" 
                  alt="PharmaLync" 
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold">PharmaLync</span>
              </div>
              <p className="text-gray-400 mb-4">
                Streamlining pharmaceutical supply chain payments through secure, efficient, and transparent digital solutions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms-of-use" className="hover:text-white">Terms of Use</Link></li>
                <li><Link href="/help-center" className="hover:text-white">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="tel:9014882779" className="hover:text-white">+91 9014882779</a></li>
                <li><a href="mailto:support@pharmalynk.com" className="hover:text-white">support@pharmalynk.com</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 PharmaLync. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}