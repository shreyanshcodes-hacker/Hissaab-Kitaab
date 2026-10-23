import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4 text-on-surface-variant shadow-sm">
        <FileQuestion className="w-8 h-8" />
      </div>
      <span className="text-label-xs font-bold text-primary uppercase tracking-wider mb-1">
        Page Not Found (404)
      </span>
      <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface mb-2">
        This ledger page does not exist
      </h1>
      <p className="text-body-sm text-on-surface-variant max-w-sm mb-6 leading-relaxed">
        The route you followed may have been moved, or the purchase invoice ID was deleted.
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Go Back
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate('/dashboard')}
          leftIcon={<Home className="w-4 h-4" />}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};
