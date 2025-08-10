import { Metadata } from "next";
import HelpForm from "@/components/HelpForm";

export const metadata: Metadata = {
  title: "Get Help - SquareFundr",
  description: "Need assistance with SquareFundr? Contact our support team for help with campaigns, payments, and technical issues.",
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            How can we help you?
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Our support team is here to assist you with any questions or issues you might have with SquareFundr.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Help Form */}
          <div className="lg:col-span-2">
            <HelpForm />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Response Time */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-blue-900">Response Time</h3>
              </div>
              <p className="text-blue-800 text-sm">
                We typically respond to help requests within 24 hours during business days.
              </p>
            </div>

            {/* FAQ */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-800 text-sm mb-1">Why aren't my PayPal squares showing as reserved?</h4>
                  <p className="text-gray-600 text-xs">
                    Squares should reserve immediately when you start the PayPal flow. If they don't, please contact support.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 text-sm mb-1">How do I set up PayPal for my campaign?</h4>
                  <p className="text-gray-600 text-xs">
                    Go to your campaign dashboard and follow the PayPal setup wizard in the payment settings.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 text-sm mb-1">Can I edit a donation after it's been made?</h4>
                  <p className="text-gray-600 text-xs">
                    Campaign organizers can edit donations from their dashboard. Contact us if you need assistance.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 text-sm mb-1">How do I download donation receipts?</h4>
                  <p className="text-gray-600 text-xs">
                    Receipts are available in your campaign dashboard under the Donations tab.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-100 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Other Ways to Reach Us</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-700">Use the form on this page (recommended)</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">Check our documentation</span>
                </div>
              </div>
            </div>

            {/* Status Page */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <h3 className="font-semibold text-green-900">System Status</h3>
              </div>
              <p className="text-green-800 text-sm">
                All systems operational
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
