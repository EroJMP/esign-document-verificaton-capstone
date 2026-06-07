'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Info, 
  FileText, 
  Shield, 
  CheckCircle2,
  Users,
  Lock,
  Database,
  Eye,
  AlertCircle,
  ExternalLink,
  Mail,
  Building2,
  Calendar,
  Code
} from 'lucide-react';
import ConcernSuggestionModal from '@/components/student/ConcernSuggestionModal';

export default function AboutPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'about' | 'terms' | 'privacy'>('about');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const scrollToSection = (section: 'about' | 'terms' | 'privacy') => {
    setActiveSection(section);
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <button
          onClick={() => router.push('/student')}
          className="inline-flex items-center text-xs sm:text-sm text-gray-600 hover:text-gray-900 mb-3 sm:mb-4"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          Back to Dashboard
        </button>
        <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
          <Info className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">About App</h1>
        </div>
        <p className="text-xs sm:text-base text-gray-600">
          Learn about the Student Portal, our terms of service, and privacy policy
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-4 sm:space-x-8 min-w-max">
          <button
            onClick={() => scrollToSection('about')}
            className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
              activeSection === 'about'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Info className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1.5 sm:mr-2" />
            About
          </button>
          <button
            onClick={() => scrollToSection('terms')}
            className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
              activeSection === 'terms'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1.5 sm:mr-2" />
            Terms & Conditions
          </button>
          <button
            onClick={() => scrollToSection('privacy')}
            className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
              activeSection === 'privacy'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1.5 sm:mr-2" />
            Privacy Policy
          </button>
        </nav>
      </div>

      {/* About Section */}
      <section id="about" className="mb-8 sm:mb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
            <Info className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">About Student Portal</h2>
          </div>

          <div className="space-y-4 sm:space-y-6 text-gray-700">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">Overview</h3>
              <p className="text-sm sm:text-base leading-relaxed">
                The Student Portal is a comprehensive digital form management and verification system designed to 
                streamline the submission and verification process for educational institutions. Our platform enables 
                students to efficiently complete, submit, and track their forms while ensuring security and authenticity 
                through advanced signature verification technology.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">Key Features</h3>
              <ul className="space-y-2 sm:space-y-3">
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm sm:text-base">
                    <strong className="text-gray-900">Digital Form Management:</strong> Access and complete all required 
                    forms through an intuitive web interface with real-time validation and progress saving.
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm sm:text-base">
                    <strong className="text-gray-900">AI-Powered Signature Verification:</strong> Advanced machine learning 
                    technology verifies signature authenticity with 90% confidence threshold, ensuring document integrity 
                    and preventing fraud.
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm sm:text-base">
                    <strong className="text-gray-900">Real-Time Status Tracking:</strong> Monitor your submission status 
                    from pending to submitted to verified with clear visual indicators and notifications.
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm sm:text-base">
                    <strong className="text-gray-900">Secure Document Storage:</strong> All submissions are securely stored 
                    with encryption, and you can download PDF copies of your submitted forms at any time.
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm sm:text-base">
                    <strong className="text-gray-900">Multiple Signature Management:</strong> Save and manage multiple 
                    signatures (student and parent signatures) that can be reused across different forms.
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm sm:text-base">
                    <strong className="text-gray-900">Form Dependencies:</strong> Intelligent system ensures you complete 
                    prerequisite forms before accessing dependent forms, maintaining proper workflow.
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Technology Stack</h4>
                  <p className="text-xs sm:text-sm text-gray-700">
                    Built with modern web technologies including Next.js, React, TypeScript, and Supabase for secure 
                    backend infrastructure. The signature verification system utilizes Convolutional Neural Networks (CNN) 
                    with FastAPI for high-accuracy authentication.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Version Information</h4>
                  <p className="text-xs sm:text-sm text-gray-700 mb-2">
                    <strong>Version:</strong> 1.0.0
                  </p>
                  <p className="text-xs sm:text-sm text-gray-700">
                    <strong>Last Updated:</strong> {new Date().getFullYear()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Terms & Conditions Section */}
      <section id="terms" className="mb-8 sm:mb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Terms & Conditions</h2>
          </div>

          <div className="space-y-4 sm:space-y-6 text-gray-700">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-sm sm:text-base leading-relaxed mb-3 sm:mb-4">
                By accessing and using the Student Portal, you agree to be bound by the following terms and conditions. 
                Please read these terms carefully before using the service.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">1. Acceptance of Terms</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                By accessing or using this Student Portal, you acknowledge that you have read, understood, and agree to 
                be bound by these Terms & Conditions and all applicable laws and regulations. If you do not agree with 
                any of these terms, you are prohibited from using or accessing this site.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">2. User Accounts and Responsibilities</h3>
              <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 text-sm sm:text-base">
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You agree to provide accurate, current, and complete information during registration and form submission.</li>
                <li>You are responsible for all activities that occur under your account.</li>
                <li>You must immediately notify your institution of any unauthorized use of your account.</li>
                <li>You agree not to share your account credentials with others.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">3. Form Submissions</h3>
              <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 text-sm sm:text-base">
                <li>All information submitted through forms must be accurate and truthful.</li>
                <li>You are responsible for ensuring that all required documents and signatures are properly provided.</li>
                <li>Submission of false or misleading information may result in account suspension or termination.</li>
                <li>Once a form is verified, it cannot be edited or deleted through the portal.</li>
                <li>Forms may be subject to review and verification by authorized administrators.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">4. Signature Verification</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                The Student Portal uses advanced AI technology to verify signature authenticity. By using this service:
              </p>
              <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 text-sm sm:text-base">
                <li>You agree that all signatures submitted are your own authentic signatures.</li>
                <li>You understand that signature verification is required for form submission.</li>
                <li>You acknowledge that verification failures may prevent form submission.</li>
                <li>You agree not to attempt to circumvent or manipulate the verification system.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">5. Intellectual Property</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                All content, features, and functionality of the Student Portal, including but not limited to text, graphics, 
                logos, and software, are the property of the educational institution or its licensors and are protected by 
                copyright, trademark, and other intellectual property laws.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">6. Prohibited Activities</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">You agree not to:</p>
              <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 text-sm sm:text-base">
                <li>Use the portal for any illegal or unauthorized purpose.</li>
                <li>Attempt to gain unauthorized access to any part of the system.</li>
                <li>Interfere with or disrupt the portal's servers or networks.</li>
                <li>Upload viruses, malware, or any malicious code.</li>
                <li>Violate any applicable laws or regulations.</li>
                <li>Impersonate any person or entity.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">7. Limitation of Liability</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                The Student Portal is provided "as is" without warranties of any kind. The institution shall not be liable 
                for any indirect, incidental, special, or consequential damages arising from your use of the portal. While 
                we strive to maintain service availability, we do not guarantee uninterrupted or error-free operation.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">8. Termination</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                The institution reserves the right to suspend or terminate your access to the Student Portal at any time, 
                with or without notice, for any violation of these terms or for any other reason deemed necessary by the 
                institution.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">9. Changes to Terms</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                We reserve the right to modify these Terms & Conditions at any time. Your continued use of the portal 
                after changes are posted constitutes your acceptance of the modified terms. We encourage you to review 
                these terms periodically.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">10. Contact Information</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                If you have questions about these Terms & Conditions, please contact your school administrator or the 
                IT support department.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Policy Section */}
      <section id="privacy" className="mb-8 sm:mb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Privacy Policy</h2>
          </div>

          <div className="space-y-4 sm:space-y-6 text-gray-700">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-sm sm:text-base leading-relaxed mb-3 sm:mb-4">
                Your privacy is important to us. This Privacy Policy explains how we collect, use, protect, and share your 
                personal information when you use the Student Portal.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">1. Information We Collect</h3>
              <div className="mb-2 sm:mb-3">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1.5 sm:mb-2">Personal Information:</h4>
                <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 text-sm sm:text-base">
                  <li>Name (first name, last name)</li>
                  <li>Email address</li>
                  <li>Student identification information</li>
                  <li>Form submission data and responses</li>
                  <li>Signature data (encrypted and securely stored)</li>
                  <li>Profile information you provide</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1.5 sm:mb-2">Technical Information:</h4>
                <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 text-sm sm:text-base">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Usage patterns and access logs</li>
                  <li>Session information</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">2. How We Use Your Information</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">We use your information to:</p>
              <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 text-sm sm:text-base">
                <li>Provide and maintain the Student Portal services</li>
                <li>Process and manage your form submissions</li>
                <li>Verify signature authenticity using AI technology</li>
                <li>Communicate with you about your account and submissions</li>
                <li>Ensure security and prevent fraud</li>
                <li>Comply with legal obligations and institutional policies</li>
                <li>Improve and optimize the portal's functionality</li>
                <li>Generate reports for authorized administrators</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">3. Data Security</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                We implement industry-standard security measures to protect your personal information:
              </p>
              <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 text-sm sm:text-base">
                <li><strong>Encryption:</strong> All data is encrypted in transit (HTTPS/TLS) and at rest</li>
                <li><strong>Access Controls:</strong> Strict access controls ensure only authorized personnel can access your data</li>
                <li><strong>Authentication:</strong> Secure authentication mechanisms protect your account</li>
                <li><strong>Secure Storage:</strong> Data is stored on secure servers with regular backups</li>
                <li><strong>Audit Logs:</strong> All access to your data is logged and monitored</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Signature Data Security</h4>
                  <p className="text-xs sm:text-sm text-gray-700">
                    Your signature data is stored separately in encrypted storage buckets with user-specific access controls. 
                    Signatures are processed by secure ML verification services and are never shared with third parties.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">4. Information Sharing</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 text-sm sm:text-base">
                <li><strong>Authorized Administrators:</strong> Your form submissions and related data are accessible to authorized school administrators and staff members who need access to perform their duties</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or legal process</li>
                <li><strong>Service Providers:</strong> We may share limited information with trusted service providers who assist in operating the portal (all bound by confidentiality agreements)</li>
                <li><strong>Institutional Purposes:</strong> Information may be used for legitimate educational and administrative purposes</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">5. Your Rights and Choices</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">You have certain rights regarding your personal information:</p>
              <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mb-2 sm:mb-3 text-sm sm:text-base">
                <li><strong>Access:</strong> You can view your submitted forms and personal information through the portal</li>
                <li><strong>Correction:</strong> You can update certain information in your account settings</li>
                <li><strong>Deletion:</strong> You can delete unverified form submissions (verified submissions cannot be deleted for record-keeping purposes)</li>
                <li><strong>Account Management:</strong> You can manage your account settings, including signature preferences</li>
                <li><strong>Data Portability:</strong> You can download PDF copies of your submitted forms</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">6. Data Retention</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, 
                comply with legal obligations, resolve disputes, and enforce our agreements. Form submissions and signatures 
                may be retained according to your institution's record-keeping policies and legal requirements.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">7. Cookies and Tracking</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                The Student Portal uses essential cookies and session storage to maintain your login session and provide 
                core functionality. We do not use tracking cookies or third-party analytics that identify individual users. 
                Session data is cleared when you log out.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">8. Children's Privacy</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                The Student Portal is designed for educational use and complies with applicable privacy laws protecting 
                children's information. We only collect information necessary for educational purposes and do not share it 
                outside the educational context without appropriate consent.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">9. Third-Party Services</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                The portal integrates with secure third-party services for authentication, database management, and ML 
                verification. These services are bound by strict data protection agreements and privacy standards. We do not 
                share your personal information with advertising or marketing companies.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">10. International Data Transfers</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                If your data is processed or stored in locations outside your country, we ensure appropriate safeguards are 
                in place to protect your information in accordance with applicable data protection laws.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">11. Changes to This Privacy Policy</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by posting 
                the updated policy on this page and updating the "Last Updated" date. Your continued use of the portal after 
                changes are posted constitutes acceptance of the updated policy.
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">12. Contact Us</h3>
              <p className="text-sm sm:text-base leading-relaxed mb-2 sm:mb-3">
                If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, 
                please contact your school administrator or the IT support department. For privacy-related inquiries, 
                you can also reach out through your institution's official channels.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Our Commitment</h4>
                  <p className="text-xs sm:text-sm text-gray-700">
                    We are committed to protecting your privacy and ensuring the security of your personal information. 
                    Your trust is important to us, and we work continuously to maintain the highest standards of data protection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 text-center">
        <p className="text-xs sm:text-sm text-gray-600 mb-3">
          For questions or concerns about this application, please contact your school administrator or IT support team
          {' '}or{' '}
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-green-600 hover:text-green-700 underline font-medium"
          >
            report concerns or submit a suggestion
          </button>
          .
        </p>
      </div>

      {/* Concern/Suggestion Modal */}
      <ConcernSuggestionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

