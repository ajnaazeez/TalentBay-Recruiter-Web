import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Headphones,
  Mail,
  Globe,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'How do candidate suggestions work in Candidate Connect?',
    answer:
      'Our intelligent matching engine compares the required skills from your active job postings against the candidate talent database. Candidates with a skill overlap of 40% or higher are automatically ranked and surfaced in your Suggestions tab.',
  },
  {
    question: 'How does AI Candidate Evaluation generate scores for applicants?',
    answer:
      'When candidates apply to your job opening, our AI analyzes their past experience, education, skills, and preferences against your specific job criteria to produce a match percentage score and recommendation summary.',
  },
  {
    question: 'Are recruiter and candidate chat messages encrypted?',
    answer:
      'Yes. TalentBay uses robust AES-CTR (128-bit counter) encryption with PKCS#7 padding for all real-time chat messages, ensuring complete confidentiality between recruiters and job seekers.',
  },
  {
    question: 'What happens when an active job posting reaches its expiry date?',
    answer:
      'When a job expires (30 days from creation), it automatically transitions to Closed Positions. You can view past applicants at any time or use the Repost Job feature to reactivate the opening with a new 30-day window.',
  },
  {
    question: 'How do I upgrade or cancel my recruiter subscription?',
    answer:
      'Navigate to the Subscription tab in the sidebar to review all 4 available plans (Trial, Monthly, 6 Months, Yearly) and complete secure online payment via Razorpay. You can cancel auto-renewal anytime from the Settings page.',
  },
];

export const SupportPage: React.FC = () => {
  const navigate = useNavigate();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText('support@talentbay.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    setIsSubmitted(true);
    setTimeout(() => {
      setTicketSubject('');
      setTicketMessage('');
      setIsSubmitted(false);
    }, 4000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-16 min-w-0">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Hero Card */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-10 border border-slate-200/90 dark:border-slate-800 shadow-xs text-center relative overflow-hidden w-full min-w-0">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200/60 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 mx-auto mb-6 shadow-xs">
          <Headphones className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          WE'RE HERE TO HELP
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-2 leading-relaxed">
          Have questions, feedback, or need assistance? Reach out to our support team.
        </p>

        {/* 3 Verified Contact Option Cards Matching Flutter Source of Truth */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 sm:mt-8 w-full min-w-0 text-left">
          {/* 1. EMAIL US */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500/50 transition group flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform shadow-xs">
                  <Mail className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  title="Copy email address"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg transition"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">EMAIL US</h3>
              <a
                href="mailto:support@talentbay.com"
                className="inline-block text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 break-all hover:text-teal-600 dark:hover:text-teal-400 underline decoration-slate-300 dark:decoration-slate-600 hover:decoration-teal-500 underline-offset-2 transition"
              >
                support@talentbay.com
              </a>
            </div>

            <a
              href="mailto:support@talentbay.com"
              className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-3 flex items-center gap-1 hover:underline w-fit"
            >
              Open Mail Client &rarr;
            </a>
          </div>

          {/* 2. VISIT WEBSITE */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500/50 transition group flex flex-col justify-between min-w-0">
            <div>
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3 group-hover:scale-105 transition-transform shadow-xs">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">VISIT WEBSITE</h3>
              <a
                href="https://www.waqtixllp.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 break-all hover:text-teal-600 dark:hover:text-teal-400 underline decoration-slate-300 dark:decoration-slate-600 hover:decoration-teal-500 underline-offset-2 transition"
              >
                www.waqtixllp.com
              </a>
            </div>
            <a
              href="https://www.waqtixllp.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-3 flex items-center gap-1 hover:underline w-fit"
            >
              Visit Site <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* 3. PRIVACY & POLICY */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500/50 transition group flex flex-col justify-between min-w-0">
            <div>
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3 group-hover:scale-105 transition-transform shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">PRIVACY & POLICY</h3>
              <a
                href="https://www.waqtixllp.com/privacy-and-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 break-all hover:text-teal-600 dark:hover:text-teal-400 underline decoration-slate-300 dark:decoration-slate-600 hover:decoration-teal-500 underline-offset-2 transition"
              >
                www.waqtixllp.com/privacy-and-policy
              </a>
            </div>
            <a
              href="https://www.waqtixllp.com/privacy-and-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-3 flex items-center gap-1 hover:underline w-fit"
            >
              Read Policy <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Grid: FAQs + Ticket Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 w-full min-w-0">
        {/* FAQs */}
        <div className="lg:col-span-7 space-y-4 w-full min-w-0">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white transition"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Support Message Box */}
        <div className="lg:col-span-5 w-full min-w-0">
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Send us a Message</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Directly submit an inquiry to our support engineers.
              </p>
            </div>

            {isSubmitted ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Ticket Submitted</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Thank you! Our support team will get back to your registered email address shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject</label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="e.g. Question about job applicant matching"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Message</label>
                  <textarea
                    rows={4}
                    required
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Please describe your query or issue in detail..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 dark:bg-teal-600 hover:bg-black dark:hover:bg-teal-700 rounded-xl transition shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Support Ticket
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
