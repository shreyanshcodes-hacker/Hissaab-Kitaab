import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

export const HelpPage: React.FC = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      q: 'How does Gemini AI read thermal roll receipts that have faded?',
      a: 'Hissaab Kitaab automatically enhances thermal image contrast and runs character layout detection calibrated on Indian thermal slips (Epson, TVS, Citizen retail rolls). If an ink line is too faint, the system never guesses—it highlights the line in amber as "Needs checking" for your 1-second verification.',
    },
    {
      q: 'Can I upload handwritten wholesale Mandi commission slips?',
      a: 'Yes. Commission agents in Azadpur, Khari Baoli, and regional APMC yards frequently write kachha slips in Hindi or bilingual numerals. Our AI model recognizes Devanagari numerals and Mandi trade terms (e.g. bora, katta, pauti).',
    },
    {
      q: 'What is the Daily Night Tally (Evening Reconciliation)?',
      a: 'Before closing your shop shutters at night, the Night Tally helper lets you tally today’s physical supplier slips against your cash counter outflow and credit (udhar) records in under 3 minutes.',
    },
    {
      q: 'Is my wholesale purchase pricing kept private from other shops?',
      a: '100% private. All your purchase bills, negotiated supplier rates, and item catalogs are cryptographically restricted to your authenticated shop account. No other store or wholesale agency can ever view your records.',
    },
    {
      q: 'How do I track supplier rate hikes?',
      a: 'Whenever a supplier bills you at a higher unit rate than your previous invoice, Hissaab Kitaab automatically triggers a Price Hike Alert on your dashboard and inside the Ask Hissaab Kitaab AI assistant.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <PageHeader
        title="Help & Shopkeeper Guidance"
        subtitle="Answers to common questions about receipt scanning, mandi slips, tax reconciliation, and night tallying."
        breadcrumbs={[
          { label: 'Hissaab Kitaab', onClick: () => navigate('/dashboard') },
          { label: 'Help & FAQs' },
        ]}
      />

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <Card key={idx} className="p-5 space-y-2">
            <h3 className="font-headline-sm text-base font-bold text-on-surface flex items-start gap-2">
              <span className="text-primary font-bold">Q{idx + 1}.</span>
              <span>{faq.q}</span>
            </h3>
            <p className="text-body-sm text-on-surface-variant leading-relaxed pl-6">
              {faq.a}
            </p>
          </Card>
        ))}
      </div>

      <div className="p-6 rounded-2xl bg-surface-container border border-outline flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-headline-sm text-base font-bold text-on-surface">
            Have a question about your specific shop bills?
          </h4>
          <p className="text-body-sm text-on-surface-variant text-xs mt-0.5">
            You can ask Hissaab Kitaab AI directly about your purchase records in natural language.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/ask-shopledger')}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="font-bold flex-shrink-0"
        >
          Open Ask Hissaab Kitaab AI
        </Button>
      </div>
    </div>
  );
};
