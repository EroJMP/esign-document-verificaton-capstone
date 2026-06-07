'use client';

import { useState, useEffect } from 'react';
import { 
  Info, 
  FileText, 
  Shield, 
  CheckCircle2,
  Users,
  Lock,
  AlertCircle,
  Building2,
  Sparkles,
  Award,
  Globe,
  Zap
} from 'lucide-react';

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState<'about' | 'terms' | 'privacy'>('about');

  // Handle hash navigation from URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#terms') {
      setActiveSection('terms');
      setTimeout(() => {
        const element = document.getElementById('terms');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else if (hash === '#privacy') {
      setActiveSection('privacy');
      setTimeout(() => {
        const element = document.getElementById('privacy');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  const scrollToSection = (section: 'about' | 'terms' | 'privacy') => {
    setActiveSection(section);
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/background.png)',
        }}
      ></div>
      <div className="fixed inset-0 bg-gradient-to-br from-green-900/40 to-gray-900/60"></div>
      
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header with Icon */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-3 mt-4 drop-shadow-lg">About Student Portal</h1>
          <p className="text-gray-300 text-lg">
            Learn about our platform, terms of service, and privacy policy
          </p>
        </div>

        {/* Modern Navigation Tabs - Sticky */}
        <div className="mb-8 sticky top-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-xl">
            <nav className="flex space-x-2">
              <button
                onClick={() => scrollToSection('about')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 ${
                  activeSection === 'about'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/20'
                }`}
              >
                <Info className="h-4 w-4" />
                <span>About</span>
              </button>
              <button
                onClick={() => scrollToSection('terms')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 ${
                  activeSection === 'terms'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/20'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Terms & Conditions</span>
              </button>
              <button
                onClick={() => scrollToSection('privacy')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 ${
                  activeSection === 'privacy'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/20'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Privacy Policy</span>
              </button>
            </nav>
          </div>
        </div>

        {/* About Section */}
        <section id="about" className="mb-12">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Section Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <Info className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">About Student Portal</h2>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Overview Card */}
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border border-green-200/50">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center">
                  <Sparkles className="h-5 w-5 text-green-600 mr-2" />
                  Overview
                </h3>
                <p className="leading-relaxed text-gray-700">
                  The Student Portal is a comprehensive digital form management and verification system designed to 
                  streamline the submission and verification process for educational institutions. Our platform enables 
                  students to efficiently complete, submit, and track their forms while ensuring security and authenticity 
                  through advanced signature verification technology.
                </p>
              </div>

              {/* Key Features */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Award className="h-5 w-5 text-green-600 mr-2" />
                  Key Features
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      title: 'Digital Form Management',
                      desc: 'Access and complete all required forms through an intuitive web interface with real-time validation and progress saving.',
                      icon: FileText
                    },
                    {
                      title: 'AI-Powered Signature Verification',
                      desc: 'Advanced machine learning technology verifies signature authenticity with 90% confidence threshold, ensuring document integrity.',
                      icon: Zap
                    },
                    {
                      title: 'Real-Time Status Tracking',
                      desc: 'Monitor your submission status from pending to submitted to verified with clear visual indicators and notifications.',
                      icon: Globe
                    },
                    {
                      title: 'Secure Document Storage',
                      desc: 'All submissions are securely stored with encryption, and you can download PDF copies of your submitted forms at any time.',
                      icon: Lock
                    },
                    {
                      title: 'Multiple Signature Management',
                      desc: 'Save and manage multiple signatures (student and parent signatures) that can be reused across different forms.',
                      icon: Users
                    },
                    {
                      title: 'Form Dependencies',
                      desc: 'Intelligent system ensures you complete prerequisite forms before accessing dependent forms, maintaining proper workflow.',
                      icon: CheckCircle2
                    }
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-5 border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="bg-green-100 rounded-lg p-2 group-hover:bg-green-200 transition-colors">
                          <feature.icon className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                          <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="flex items-start space-x-3">
                    <Building2 className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Technology Stack</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Built with modern web technologies including Next.js, React, TypeScript, and Supabase for secure 
                        backend infrastructure. The signature verification system utilizes Convolutional Neural Networks (CNN) 
                        with FastAPI for high-accuracy authentication.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <Users className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Version Information</h4>
                      <p className="text-sm text-gray-700 mb-1">
                        <strong className="text-gray-900">Version:</strong> 1.0.0
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong className="text-gray-900">Last Updated:</strong> {new Date().getFullYear()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Terms & Conditions Section */}
        <section id="terms" className="mb-12">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Terms & Conditions</h2>
              </div>
            </div>

            <div className="p-8">
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">
                  <strong className="text-gray-900">Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-gray-700 leading-relaxed">
                  By accessing and using the Student Portal, you agree to be bound by the following terms and conditions. 
                  Please read these terms carefully before using the service.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  { num: 1, title: 'Acceptance of Terms', content: 'By accessing or using this Student Portal, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.' },
                  { num: 2, title: 'User Accounts and Responsibilities', isList: true, items: [
                    'You are responsible for maintaining the confidentiality of your account credentials.',
                    'You agree to provide accurate, current, and complete information during registration and form submission.',
                    'You are responsible for all activities that occur under your account.',
                    'You must immediately notify your institution of any unauthorized use of your account.',
                    'You agree not to share your account credentials with others.'
                  ]},
                  { num: 3, title: 'Form Submissions', isList: true, items: [
                    'All information submitted through forms must be accurate and truthful.',
                    'You are responsible for ensuring that all required documents and signatures are properly provided.',
                    'Submission of false or misleading information may result in account suspension or termination.',
                    'Once a form is verified, it cannot be edited or deleted through the portal.',
                    'Forms may be subject to review and verification by authorized administrators.'
                  ]},
                  { num: 4, title: 'Signature Verification', intro: 'The Student Portal uses advanced AI technology to verify signature authenticity. By using this service:', isList: true, items: [
                    'You agree that all signatures submitted are your own authentic signatures.',
                    'You understand that signature verification is required for form submission.',
                    'You acknowledge that verification failures may prevent form submission.',
                    'You agree not to attempt to circumvent or manipulate the verification system.'
                  ]},
                  { num: 5, title: 'Intellectual Property', content: 'All content, features, and functionality of the Student Portal, including but not limited to text, graphics, logos, and software, are the property of the educational institution or its licensors and are protected by copyright, trademark, and other intellectual property laws.' },
                  { num: 6, title: 'Prohibited Activities', intro: 'You agree not to:', isList: true, items: [
                    'Use the portal for any illegal or unauthorized purpose.',
                    'Attempt to gain unauthorized access to any part of the system.',
                    'Interfere with or disrupt the portal\'s servers or networks.',
                    'Upload viruses, malware, or any malicious code.',
                    'Violate any applicable laws or regulations.',
                    'Impersonate any person or entity.'
                  ]},
                  { num: 7, title: 'Limitation of Liability', content: 'The Student Portal is provided "as is" without warranties of any kind. The institution shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the portal. While we strive to maintain service availability, we do not guarantee uninterrupted or error-free operation.' },
                  { num: 8, title: 'Termination', content: 'The institution reserves the right to suspend or terminate your access to the Student Portal at any time, with or without notice, for any violation of these terms or for any other reason deemed necessary by the institution.' },
                  { num: 9, title: 'Changes to Terms', content: 'We reserve the right to modify these Terms & Conditions at any time. Your continued use of the portal after changes are posted constitutes your acceptance of the modified terms. We encourage you to review these terms periodically.' },
                  { num: 10, title: 'Contact Information', content: 'If you have questions about these Terms & Conditions, please contact your school administrator or the IT support department.' }
                ].map((item) => (
                  <div key={item.num} className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-300">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                      <span className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                        {item.num}
                      </span>
                      {item.title}
                    </h3>
                    {item.intro && <p className="text-gray-700 mb-3 leading-relaxed">{item.intro}</p>}
                    {item.content && <p className="text-gray-700 leading-relaxed">{item.content}</p>}
                    {item.isList && (
                      <ul className="space-y-2 mt-3">
                        {item.items?.map((listItem, idx) => (
                          <li key={idx} className="flex items-start text-gray-700">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{listItem}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Policy Section */}
        <section id="privacy" className="mb-12">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Privacy Policy</h2>
              </div>
            </div>

            <div className="p-8">
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">
                  <strong className="text-gray-900">Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Your privacy is important to us. This Privacy Policy explains how we collect, use, protect, and share your 
                  personal information when you use the Student Portal.
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">1. Information We Collect</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Personal Information:</h4>
                      <ul className="space-y-1">
                        {['Name (first name, last name)', 'Email address', 'Student identification information', 'Form submission data', 'Signature data', 'Profile information'].map((item, idx) => (
                          <li key={idx} className="flex items-center text-sm text-gray-700">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Technical Information:</h4>
                      <ul className="space-y-1">
                        {['IP address and device info', 'Browser type and version', 'Usage patterns and logs', 'Session information'].map((item, idx) => (
                          <li key={idx} className="flex items-center text-sm text-gray-700">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">2. How We Use Your Information</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      'Provide and maintain services',
                      'Process and manage form submissions',
                      'Verify signature authenticity',
                      'Communicate about your account',
                      'Ensure security and prevent fraud',
                      'Comply with legal obligations',
                      'Improve portal functionality',
                      'Generate reports for administrators'
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Signature Data Security</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Your signature data is stored separately in encrypted storage buckets with user-specific access controls. 
                        Signatures are processed by secure ML verification services and are never shared with third parties.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-6">
                  <div className="flex items-start space-x-3">
                    <Lock className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Our Commitment</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        We are committed to protecting your privacy and ensuring the security of your personal information. 
                        Your trust is important to us, and we work continuously to maintain the highest standards of data protection.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20 shadow-xl">
          <p className="text-white/90">
            For questions or concerns about this application, please contact your school administrator or IT support team.
          </p>
        </div>
      </div>
    </div>
  );
}
