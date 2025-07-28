import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - SquareFundr',
  description: 'Privacy Policy for SquareFundr - Learn how we protect your data and privacy.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black py-8">
      <div className="container-responsive max-w-4xl">
        <div className="card">
          <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
          
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Introduction</h2>
              <p className="leading-relaxed">
                At SquareFundr, we are committed to protecting your privacy and ensuring the security of your personal information. 
                This Privacy Policy explains how we collect, use, and safeguard your data when you use our fundraising platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Information We Collect</h2>
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-white">Personal Information</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Name and email address when you create an account</li>
                  <li>Payment information (processed securely through PayPal)</li>
                  <li>Campaign details and fundraising information</li>
                  <li>Donor information for campaign tracking</li>
                </ul>
                
                <h3 className="text-lg font-medium text-white">Technical Information</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>IP address and browser information</li>
                  <li>Usage data and analytics</li>
                  <li>Device information and cookies</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>To provide and maintain our fundraising platform</li>
                <li>To process donations and payments</li>
                <li>To communicate with you about your campaigns</li>
                <li>To improve our services and user experience</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Data Protection</h2>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  We implement industry-standard security measures to protect your personal information:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Encryption of sensitive data in transit and at rest</li>
                  <li>Secure payment processing through PayPal</li>
                  <li>Regular security audits and updates</li>
                  <li>Limited access to personal data by authorized personnel only</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">We Do Not Share Your Data</h2>
              <p className="leading-relaxed">
                We are committed to protecting your privacy and will not sell, trade, or otherwise transfer your personal information to third parties, except:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
                <li>With your explicit consent</li>
                <li>To comply with legal requirements</li>
                <li>To protect our rights and safety</li>
                <li>With trusted service providers who assist in operating our platform (under strict confidentiality agreements)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Your Rights</h2>
              <p className="leading-relaxed">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
                <li>Export your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Cookies and Tracking</h2>
              <p className="leading-relaxed">
                We use cookies and similar technologies to improve your experience on our platform. 
                You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Children's Privacy</h2>
              <p className="leading-relaxed">
                Our platform is not intended for children under 13 years of age. 
                We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time. 
                We will notify you of any changes by posting the new Privacy Policy on this page 
                and updating the "Last Updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Contact Us</h2>
              <p className="leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, 
                please contact us at privacy@squarefundr.com
              </p>
            </section>

            <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400">
                <strong>Last Updated:</strong> December 2024
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 