'use client';

import { useState } from 'react';
import { 
  HelpCircle, 
  Phone, 
  Mail, 
  MessageCircle, 
  BookOpen, 
  Video, 
  Download, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Search,
  FileText,
  Settings,
  CreditCard,
  Smartphone,
  Shield,
  MapPin,
  Calendar,
  Star
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const helpCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Learn the basics and set up your account',
    articles: [
      { title: 'Creating Your Account', icon: Users, time: '5 min read' },
      { title: 'Understanding User Roles', icon: Shield, time: '8 min read' },
      { title: 'First Login Setup', icon: Settings, time: '3 min read' },
      { title: 'Mobile App Installation', icon: Smartphone, time: '4 min read' }
    ]
  },
  {
    id: 'payments',
    title: 'Payments & Billing',
    icon: CreditCard,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    description: 'Manage payments, invoices, and billing',
    articles: [
      { title: 'Creating Invoices', icon: FileText, time: '6 min read' },
      { title: 'Payment Collection Process', icon: CreditCard, time: '10 min read' },
      { title: 'OTP Verification Guide', icon: Shield, time: '5 min read' },
      { title: 'Handling Partial Payments', icon: CreditCard, time: '7 min read' }
    ]
  },
  {
    id: 'technical',
    title: 'Technical Support',
    icon: Settings,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: 'Technical issues and troubleshooting',
    articles: [
      { title: 'Login Problems', icon: Users, time: '4 min read' },
      { title: 'OTP Not Received', icon: Smartphone, time: '3 min read' },
      { title: 'Sync Issues', icon: Clock, time: '6 min read' },
      { title: 'App Performance Tips', icon: Settings, time: '5 min read' }
    ]
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    description: 'Security features and privacy settings',
    articles: [
      { title: 'Account Security Best Practices', icon: Shield, time: '8 min read' },
      { title: 'Data Privacy Settings', icon: Shield, time: '6 min read' },
      { title: 'Two-Factor Authentication', icon: Shield, time: '4 min read' },
      { title: 'Recognizing Phishing Attempts', icon: AlertCircle, time: '7 min read' }
    ]
  }
];

const videoTutorials = [
  {
    title: 'PharmaLync Complete Overview',
    duration: '15:30',
    level: 'Beginner',
    thumbnail: '/video-thumb-1.jpg',
    description: 'Complete walkthrough of all features and functionality'
  },
  {
    title: 'Payment Collection Process',
    duration: '8:45',
    level: 'Intermediate',
    thumbnail: '/video-thumb-2.jpg',
    description: 'Step-by-step guide to collecting payments with OTP verification'
  },
  {
    title: 'Admin Dashboard Tutorial',
    duration: '12:20',
    level: 'Advanced',
    thumbnail: '/video-thumb-3.jpg',
    description: 'Advanced features for wholesalers and super admins'
  },
  {
    title: 'Mobile App Features',
    duration: '6:15',
    level: 'Beginner',
    thumbnail: '/video-thumb-4.jpg',
    description: 'Using PharmaLync on mobile devices for field operations'
  }
];

const downloadableResources = [
  {
    title: 'User Manual PDF',
    type: 'PDF',
    size: '2.4 MB',
    icon: FileText,
    description: 'Comprehensive user guide with screenshots'
  },
  {
    title: 'Quick Start Guide',
    type: 'PDF',
    size: '856 KB',
    icon: FileText,
    description: 'Essential information to get started quickly'
  },
  {
    title: 'Security Best Practices',
    type: 'PDF',
    size: '1.2 MB',
    icon: Shield,
    description: 'Security guidelines and best practices'
  },
  {
    title: 'API Documentation',
    type: 'PDF',
    size: '3.1 MB',
    icon: FileText,
    description: 'Technical documentation for developers'
  }
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = helpCategories.filter(category =>
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.articles.some(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

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
              <Link href="/terms-of-use" className="text-gray-600 hover:text-gray-900">Terms of Use</Link>
              <Link href="/help-center" className="text-blue-600 font-medium">Help Center</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <HelpCircle className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-xl text-blue-100 mb-8">
            Find answers, tutorials, and support resources to make the most of PharmaLync.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help articles, videos, and more..."
              className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Live Chat</h3>
            </div>
            <p className="text-gray-600 mb-4">Chat with our support team in real-time</p>
            <button className="text-blue-600 font-medium hover:text-blue-700">
              Start Chat →
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Phone className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Phone Support</h3>
            </div>
            <p className="text-gray-600 mb-4">Call us for immediate assistance</p>
            <a href="tel:9014882779" className="text-blue-600 font-medium hover:text-blue-700">
              Call Now →
            </a>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Email Support</h3>
            </div>
            <p className="text-gray-600 mb-4">Get detailed help via email</p>
            <a href="mailto:support@pharmalynk.com" className="text-blue-600 font-medium hover:text-blue-700">
              Send Email →
            </a>
          </div>
        </div>

        {/* Help Categories */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Help Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCategories.map((category) => {
              const Icon = category.icon;
              const isOpen = selectedCategory === category.id;
              
              return (
                <div key={category.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <button
                    onClick={() => setSelectedCategory(isOpen ? null : category.id)}
                    className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${category.bgColor}`}>
                        <Icon className={`h-6 w-6 ${category.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{category.title}</h3>
                        <p className="text-gray-600 text-sm">{category.description}</p>
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <span>{category.articles.length} articles</span>
                          <ArrowRight className={`h-4 w-4 ml-2 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-6 border-t">
                      <div className="space-y-3 mt-4">
                        {category.articles.map((article, index) => (
                          <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <div className="flex items-center space-x-3">
                              <article.icon className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-900">{article.title}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{article.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Video Tutorials */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Video Tutorials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {videoTutorials.map((video, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gray-200 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                      <Play className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{video.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{video.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {video.level}
                    </span>
                    <button className="text-blue-600 text-sm hover:text-blue-700">
                      Watch →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Downloadable Resources */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Downloadable Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {downloadableResources.map((resource, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <resource.icon className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{resource.title}</h3>
                    <p className="text-sm text-gray-500">{resource.type} • {resource.size}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">{resource.description}</p>
                <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Support Hours */}
        <div className="bg-blue-50 rounded-lg p-8 text-center">
          <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Support Hours</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Phone Support</h4>
              <p className="text-gray-600 text-sm">Mon-Fri: 9:00 AM - 6:00 PM</p>
              <p className="text-gray-600 text-sm">Sat: 10:00 AM - 4:00 PM</p>
              <p className="text-gray-600 text-sm">Sun: Closed</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Live Chat</h4>
              <p className="text-gray-600 text-sm">Mon-Fri: 9:00 AM - 8:00 PM</p>
              <p className="text-gray-600 text-sm">Sat-Sun: 10:00 AM - 6:00 PM</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Email Support</h4>
              <p className="text-gray-600 text-sm">24/7 Response</p>
              <p className="text-gray-600 text-sm">Within 24 hours</p>
            </div>
          </div>
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

// Play icon component
function Play({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
  );
}