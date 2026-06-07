'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft,
  FileText,
  PenTool,
  CheckCircle,
  Clock,
  Shield,
  Trash2,
  AlertCircle,
  Upload,
  Download,
  User,
  Mail,
  Search
} from 'lucide-react';
import ConcernSuggestionModal from '@/components/student/ConcernSuggestionModal';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  // Getting Started
  {
    id: 'getting-started-1',
    question: 'How do I access my forms?',
    answer: 'To access forms, you need to use the access link provided by your administrator. When you receive the access link:\n1. Click on the link (it may require you to log in first)\n2. Once logged in, you\'ll be redirected to the form\n3. Start filling out the form and submit when complete\n\nIf you don\'t have an access link, please contact your school administrator to request one.',
    category: 'Getting Started'
  },
  {
    id: 'getting-started-2',
    question: 'What does each status badge mean?',
    answer: '• **Pending** (Yellow): You\'ve started filling the form but haven\'t submitted it yet. Click "Continue" to resume.\n• **Submitted** (Green): Your form has been successfully submitted and is waiting for verification.\n• **Verified** (Blue with shield): Your form has been verified and cannot be deleted.\n• **No Badge**: You haven\'t started this form yet. Click "Start Form" to begin.',
    category: 'Getting Started'
  },
  {
    id: 'getting-started-3',
    question: 'Can I see my form submission history?',
    answer: 'Yes! You can view your submitted forms on the dashboard. Click "View Submission" on any submitted form (green badge) to see the details of your submission, including the PDF and all form data. However, once a form is verified (blue badge with shield), you will no longer be able to view the submitted document.',
    category: 'Getting Started'
  },
  
  // Forms
  {
    id: 'forms-1',
    question: 'How do I fill out a form?',
    answer: '1. Click on a form card from your dashboard\n2. Fill in all required fields (marked with *)\n3. Upload or add required documents if needed\n4. Add your signature when prompted\n5. Review your entries and click "Submit"',
    category: 'Forms'
  },
  {
    id: 'forms-2',
    question: 'Can I save my progress and come back later?',
    answer: 'Yes! You can save your progress at any time. If you don\'t complete a form, it will be saved as "Pending" and you can click "Continue" to resume filling it out later. All your entered data will be preserved.',
    category: 'Forms'
  },
  {
    id: 'forms-3',
    question: 'What if I make a mistake on a submitted form?',
    answer: 'If your form shows a "Submitted" status (green badge), you can delete it and start over by clicking the "Delete" button. However, once a form is "Verified" (blue badge), it cannot be deleted. Please contact your administrator if you need to make changes to a verified form.',
    category: 'Forms'
  },
  {
    id: 'forms-4',
    question: 'Why can\'t I see some forms?',
    answer: 'Forms may be hidden if they have availability dates. Check the form description for "Available From" and "Available Until" dates. Some forms may also require completing other forms first - these requirements will be shown on the form card.',
    category: 'Forms'
  },
  
  // Signatures
  {
    id: 'signatures-1',
    question: 'How do I add my signature?',
    answer: 'Go to Settings → Signatures tab. You can add signatures in two ways:\n• **Upload**: Upload signature images (PNG, JPG, JPEG)\n• **Draw**: Use your mouse or touchscreen to draw your signature\n\nYou can add multiple signatures for both student and parent signatures. Each signature will be verified using our AI system.',
    category: 'Signatures'
  },
  {
    id: 'signatures-2',
    question: 'How does signature verification work?',
    answer: 'Our system uses AI to verify your signatures. You need to upload or draw 7 signature samples. The system will analyze them to ensure they\'re authentic and consistent. Signatures must meet a 90% confidence threshold to be approved. You\'ll see green checkmarks for verified signatures and red warnings for flagged ones.',
    category: 'Signatures'
  },
  {
    id: 'signatures-3',
    question: 'What if my signature is flagged during verification?',
    answer: 'If a signature is flagged (red indicator), it may be inconsistent or unclear. Try:\n• Drawing/uploading clearer signatures\n• Ensuring all 7 signatures look similar\n• Using better lighting if taking photos\n• Drawing more carefully\n\nRemove flagged signatures and add new ones until all 7 pass verification.',
    category: 'Signatures'
  },
  {
    id: 'signatures-4',
    question: 'Can I use different signatures for different forms?',
    answer: 'Yes! You can save multiple signatures and select which one to use when filling out each form. All saved signatures must be verified before they can be used. When signing a form, you\'ll see all your verified signatures to choose from.',
    category: 'Signatures'
  },
  {
    id: 'signatures-5',
    question: 'Why do I need to verify my signature on each form?',
    answer: 'For security and authenticity, each signature you add to a form must pass real-time verification (90% confidence). This ensures the signature matches your saved verified signatures. This protects both you and the school from fraud.',
    category: 'Signatures'
  },
  
  // Submission
  {
    id: 'submission-1',
    question: 'How do I submit a form?',
    answer: 'After filling out all required fields and adding your signature:\n1. Review all your entries\n2. Click the "Submit" button\n3. You\'ll receive a confirmation page with a submission ID\n4. A PDF copy will be generated automatically\n5. You can download the PDF or return to the dashboard',
    category: 'Submission'
  },
  {
    id: 'submission-2',
    question: 'Can I download a copy of my submitted form?',
    answer: 'Yes! After submission, you\'ll see a confirmation page with a download button. You can also view and download your submitted forms later by clicking "View Submission" on any submitted or verified form card on your dashboard.',
    category: 'Submission'
  },
  {
    id: 'submission-3',
    question: 'What happens after I submit a form?',
    answer: 'After submission:\n1. Your form status changes to "Submitted" (green badge)\n2. Administrators are notified\n3. Your form goes through the verification process\n4. Once verified, the status changes to "Verified" (blue badge with shield)\n5. You\'ll receive notifications about the status change',
    category: 'Submission'
  },
  {
    id: 'submission-4',
    question: 'Can I edit a submitted form?',
    answer: 'No, once a form is submitted, it cannot be edited. If you made a mistake on a "Submitted" form, you can delete it (if not yet verified) and start over. Verified forms cannot be deleted - please contact your administrator for assistance.',
    category: 'Submission'
  },
  
  // Account & Settings
  {
    id: 'account-1',
    question: 'How do I update my profile information?',
    answer: 'Go to Settings → Account tab. You can update your first name, last name, and email address. Changes are saved immediately. Note: Some information may need administrator approval depending on your school\'s policies.',
    category: 'Account & Settings'
  },
  {
    id: 'account-2',
    question: 'How do I change my password?',
    answer: 'Password management is handled through the authentication system. If you need to reset your password, use the "Forgot Password" link on the login page. For other account security settings, contact your administrator.',
    category: 'Account & Settings'
  },
  
  // Troubleshooting
  {
    id: 'troubleshooting-1',
    question: 'I\'m having trouble uploading a signature/image. What should I do?',
    answer: 'Make sure your file:\n• Is in PNG, JPG, or JPEG format\n• Is under 5MB in size\n• Is clear and well-lit\n• Shows the full signature\n\nIf problems persist, try:\n• Converting the image to PNG format\n• Reducing the file size\n• Using the "Draw" option instead',
    category: 'Troubleshooting'
  },
  {
    id: 'troubleshooting-2',
    question: 'The form is not submitting. What could be wrong?',
    answer: 'Check the following:\n• All required fields (marked with *) are filled\n• Your signature has been added and verified\n• You have a stable internet connection\n• No file uploads are still processing\n\nTry refreshing the page and submitting again. If the problem persists, contact support.',
    category: 'Troubleshooting'
  },
  {
    id: 'troubleshooting-3',
    question: 'I can\'t see my submitted form or it disappeared.',
    answer: 'Check the form status on your dashboard. If it shows as "Submitted" or "Verified", click "View Submission" to see it. If the form is missing entirely:\n• Refresh your dashboard\n• Check if you deleted it accidentally\n• Contact support if you believe it\'s a system error',
    category: 'Troubleshooting'
  },
  {
    id: 'troubleshooting-4',
    question: 'I\'m getting an error message when trying to verify my signature.',
    answer: 'Signature verification errors can occur if:\n• The signature doesn\'t match your saved signatures\n• The confidence score is below 90%\n• The image quality is too low\n• Network connection is unstable\n\nTry drawing/uploading a clearer signature that matches your saved ones. Ensure good image quality and try again.',
    category: 'Troubleshooting'
  },
  {
    id: 'troubleshooting-5',
    question: 'The page is loading slowly or not responding.',
    answer: 'Try these solutions:\n• Check your internet connection\n• Refresh the page (F5 or Ctrl+R)\n• Clear your browser cache\n• Try a different browser\n• Close other tabs/applications\n\nIf problems persist, contact technical support.',
    category: 'Troubleshooting'
  },
  
  // Security & Privacy
  {
    id: 'security-1',
    question: 'Is my data secure?',
    answer: 'Yes! We use industry-standard security measures:\n• All data is encrypted in transit and at rest\n• Secure authentication system\n• User-specific data isolation\n• Regular security audits\n• Your signatures and personal information are protected',
    category: 'Security & Privacy'
  },
  {
    id: 'security-2',
    question: 'Who can see my submitted forms?',
    answer: 'Only authorized administrators and school staff can access your submitted forms. Your data is not shared with third parties. All access is logged and monitored for security purposes.',
    category: 'Security & Privacy'
  }
];

const categories = [
  'All Questions',
  'Getting Started',
  'Forms',
  'Signatures',
  'Submission',
  'Account & Settings',
  'Troubleshooting',
  'Security & Privacy'
];

export default function FAQPage() {
  const router = useRouter();
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Questions');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'All Questions' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFAQ = (id: string) => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/student')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
        <div className="flex items-center space-x-3 mb-4">
          <HelpCircle className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
        </div>
        <p className="text-gray-600">
          Find answers to common questions about using the Student Portal
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setOpenFAQ(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ List */}
      <div className="space-y-4">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No questions found matching your search.</p>
          </div>
        ) : (
          filteredFAQs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => toggleFAQ(faq.id)}
                className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      {faq.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                </div>
                {openFAQ === faq.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {openFAQ === faq.id && (
                <div className="px-6 pb-4 pt-2 border-t border-gray-100">
                  <div className="pt-4">
                    <div className="prose prose-sm max-w-none">
                      {faq.answer.split('\n').map((paragraph, index) => {
                        // Handle bullet points
                        if (paragraph.trim().startsWith('•')) {
                          const content = paragraph.trim().substring(1).trim();
                          // Check for bold text
                          if (content.includes('**')) {
                            const parts = content.split('**');
                            return (
                              <div key={index} className="flex items-start mb-2">
                                <span className="text-green-600 mr-2">•</span>
                                <span className="text-gray-700">
                                  {parts.map((part, i) => 
                                    i % 2 === 1 ? (
                                      <strong key={i} className="font-semibold text-gray-900">{part}</strong>
                                    ) : (
                                      <span key={i}>{part}</span>
                                    )
                                  )}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div key={index} className="flex items-start mb-2">
                              <span className="text-green-600 mr-2">•</span>
                              <span className="text-gray-700">{content}</span>
                            </div>
                          );
                        }
                        // Handle numbered lists
                        if (/^\d+\.\s/.test(paragraph.trim())) {
                          return (
                            <div key={index} className="text-gray-700 mb-2">
                              {paragraph}
                            </div>
                          );
                        }
                        // Regular paragraphs
                        if (paragraph.trim()) {
                          return (
                            <p key={index} className="text-gray-700 mb-3 leading-relaxed">
                              {paragraph}
                            </p>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Help Section */}
      <div className="mt-12 p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start space-x-4">
          <AlertCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Still need help?</h3>
            <p className="text-gray-700 mb-3">
              If you can't find the answer to your question, please contact your school administrator or IT support team for assistance{' '}
              or{' '}
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-green-600 hover:text-green-700 underline font-medium"
              >
                report concerns or submit a suggestion
              </button>
              .
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Check your school's contact information</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Concern/Suggestion Modal */}
      <ConcernSuggestionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

