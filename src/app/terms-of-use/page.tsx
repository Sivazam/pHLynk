'use client';

import { FileText, Users, Shield, CreditCard, Smartphone, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function TermsOfUsePage() {
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
              <Link href="/privacy-policy" className="text-gray-600 hover:text-gray-900">Privacy Policy</Link>
              <Link href="/terms-of-use" className="text-blue-600 font-medium">Terms of Use</Link>
              <Link href="/help-center" className="text-gray-600 hover:text-gray-900">Help Center</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Terms of Use</h1>
          <p className="text-xl text-blue-100">
            These terms govern your use of PharmaLync's pharmaceutical supply chain payment collection system.
          </p>
          <p className="text-blue-200 mt-2">Last updated: January 2025</p>
        </div>
      </div>

      {/* Terms Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          
          {/* Acceptance of Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-6 w-6 mr-3 text-green-600" />
              Acceptance of Terms
            </h2>
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-gray-700 leading-relaxed mb-4">
                Welcome to PharmaLync! These Terms of Use ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and PharmaLync ("we," "us," or "our") governing your use of our pharmaceutical supply chain payment collection system (the "Service").
              </p>
              <p className="text-gray-700 leading-relaxed">
                By accessing, registering for, or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.
              </p>
            </div>
          </section>

          {/* Description of Service */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Users className="h-6 w-6 mr-3 text-blue-600" />
              Description of Service
            </h2>
            <div className="text-gray-600 space-y-4">
              <p>
                PharmaLync is a comprehensive pharmaceutical supply chain payment collection system designed to streamline payment processes between wholesalers, medical stores (retailers), and field workers (line workers). The Service includes:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Core Features</h4>
                  <ul className="text-sm space-y-1">
                    <li>• User authentication and role management</li>
                    <li>• Invoice creation and tracking</li>
                    <li>• Payment collection with OTP verification</li>
                    <li>• Real-time notifications and updates</li>
                    <li>• Analytics and reporting dashboards</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">User Roles</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Super Admin: System-wide administration</li>
                    <li>• Wholesaler Admin: Tenant management</li>
                    <li>• Line Worker: Field payment collection</li>
                    <li>• Retailer: Payment management</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* User Responsibilities */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="h-6 w-6 mr-3 text-purple-600" />
              User Responsibilities
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Security</h3>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <ul className="text-gray-700 space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Maintain the confidentiality of your login credentials</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Immediately notify us of any unauthorized account access</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Use strong, unique passwords and enable two-factor authentication when available</span>
                    </li>
                    <li className="flex items-start">
                      <XCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Do not share your account credentials with others</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Accurate Information</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <ul className="text-gray-700 space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Provide accurate, current, and complete information</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Update your information promptly when it changes</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Ensure all business and payment data is accurate</span>
                    </li>
                    <li className="flex items-start">
                      <XCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Do not provide false or misleading information</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Compliance with Laws</h3>
                <div className="bg-green-50 p-4 rounded-lg">
                  <ul className="text-gray-700 space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Comply with all applicable laws and regulations</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Follow pharmaceutical industry standards and guidelines</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Maintain proper business records and documentation</span>
                    </li>
                    <li className="flex items-start">
                      <XCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Do not use the Service for illegal activities</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-6 w-6 mr-3 text-green-600" />
              Payment Terms
            </h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Processing</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• All payments must be processed through the PharmaLync system</li>
                  <li>• Line Workers must collect payments using OTP verification</li>
                  <li>• Retailers must verify payments using the provided OTP</li>
                  <li>• Payment records are automatically generated and stored</li>
                  <li>• All parties receive real-time payment notifications</li>
                </ul>
              </div>

              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Disputes</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• Payment disputes must be reported within 7 days of transaction</li>
                  <li>• Provide all relevant documentation and evidence</li>
                  <li>• Disputes will be investigated within 14 business days</li>
                  <li>• Resolution decisions are final and binding</li>
                  <li>• Fraudulent claims may result in account termination</li>
                </ul>
              </div>

              <div className="bg-red-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Late Payments</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• Late payments may incur interest charges as per agreement</li>
                  <li>• Persistent late payments may result in service restrictions</li>
                  <li>• Collection activities will comply with applicable laws</li>
                  <li>• All collection costs may be charged to the delinquent party</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Prohibited Activities */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <XCircle className="h-6 w-6 mr-3 text-red-600" />
              Prohibited Activities
            </h2>
            
            <div className="bg-red-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4 font-semibold">You are strictly prohibited from:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Security Violations</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Attempting to gain unauthorized access</li>
                    <li>• Interfering with system operations</li>
                    <li>• Introducing malware or viruses</li>
                    <li>• Exploiting security vulnerabilities</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Fraudulent Activities</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Creating fake accounts or transactions</li>
                    <li>• Manipulating payment data</li>
                    <li>• Identity theft or impersonation</li>
                    <li>• Money laundering activities</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Data Misuse</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Scraping or harvesting user data</li>
                    <li>• Selling or sharing confidential information</li>
                    <li>• Reverse engineering the system</li>
                    <li>• Violating data privacy laws</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Abusive Behavior</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Harassing or threatening other users</li>
                    <li>• Sending spam or unsolicited messages</li>
                    <li>• Disrupting other users' experience</li>
                    <li>• Violating intellectual property rights</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Intellectual Property */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="h-6 w-6 mr-3 text-indigo-600" />
              Intellectual Property
            </h2>
            
            <div className="text-gray-600 space-y-4">
              <p>
                All content, features, and functionality of the Service, including but not limited to text, graphics, logos, images, software, and data compilations, are the exclusive property of PharmaLync or its licensors and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              
              <div className="bg-indigo-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Your Rights</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Limited license to access and use the Service for your business purposes</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Permission to download and print materials for personal use</span>
                  </li>
                  <li className="flex items-start">
                    <XCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>No right to modify, copy, distribute, or create derivative works</span>
                  </li>
                  <li className="flex items-start">
                    <XCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>No right to reverse engineer or decompile the system</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Service Availability */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Smartphone className="h-6 w-6 mr-3 text-teal-600" />
              Service Availability
            </h2>
            
            <div className="text-gray-600 space-y-4">
              <p>
                We strive to provide the Service with maximum availability and reliability. However, we do not guarantee that the Service will be uninterrupted, timely, secure, or error-free.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Service Level</h4>
                  <ul className="text-sm space-y-1">
                    <li>• 99.5% uptime target</li>
                    <li>• Regular maintenance windows</li>
                    <li>• Emergency maintenance as needed</li>
                    <li>• Scheduled downtime notifications</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Limitations</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Third-party service dependencies</li>
                    <li>• Internet connectivity requirements</li>
                    <li>• Force majeure events</li>
                    <li>• System upgrades and improvements</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-3 text-orange-600" />
              Limitation of Liability
            </h2>
            
            <div className="bg-orange-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, PHARMALYNC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              
              <ul className="text-gray-700 space-y-2 mb-4">
                <li>• Loss of profits, revenue, or business opportunities</li>
                <li>• Loss of or damage to data or systems</li>
                <li>• Business interruption or downtime</li>
                <li>• Any indirect or consequential damages</li>
                <li>• Third-party claims or actions</li>
              </ul>
              
              <p className="text-gray-700">
                Our total liability for any claims related to the Service shall not exceed the fees paid by you for the Service in the six (6) months preceding the claim.
              </p>
            </div>
          </section>

          {/* Termination */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Termination</h2>
            
            <div className="text-gray-600 space-y-4">
              <p>
                We reserve the right to terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including but not limited to:
              </p>
              
              <div className="bg-red-50 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Violation Reasons</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Breach of these Terms</li>
                      <li>• Fraudulent or illegal activities</li>
                      <li>• Security violations</li>
                      <li>• Abuse of other users</li>
                      <li>• Non-payment of fees</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Post-Termination</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Immediate loss of access</li>
                      <li>• Data deletion after retention period</li>
                      <li>• Survival of certain clauses</li>
                      <li>• No refund of fees</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Governing Law</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700">
                These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts located in Chennai, India.
              </p>
            </div>
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