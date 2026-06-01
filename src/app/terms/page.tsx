import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service · Swipe Safe',
  description:
    'The terms that govern your use of Swipe Safe, including what the service does, its limits, and your responsibilities.',
};

const LAST_UPDATED = 'May 31, 2026';
const CONTACT_EMAIL = 'support@swipesafe.app';

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      intro="These terms govern your use of Swipe Safe. By using the service, you agree to them. Please read the section on what Swipe Safe is — and isn't — carefully."
    >
      <section>
        <h2>1. Acceptance of these terms</h2>
        <p>
          By accessing or using Swipe Safe (the &quot;Service&quot;), you agree to be bound by
          these Terms of Service and our{' '}
          <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t
          use the Service.
        </p>
      </section>

      <section>
        <h2>2. Who can use Swipe Safe</h2>
        <p>
          You must be at least 18 years old to use the Service. By using it, you confirm that you
          meet this requirement and that the information you provide is accurate.
        </p>
      </section>

      <section>
        <h2>3. What Swipe Safe is — and isn&apos;t</h2>
        <p>
          Swipe Safe uses artificial intelligence to analyze conversations and highlight possible
          signs of scams, manipulation, and relationship patterns. It is a{' '}
          <strong>decision-support tool — a second opinion</strong>, not a guarantee.
        </p>
        <ul>
          <li>
            It is <strong>not</strong> professional, legal, psychological, financial, or safety
            advice.
          </li>
          <li>
            It does <strong>not</strong> verify anyone&apos;s identity and cannot confirm whether a
            person is genuine.
          </li>
          <li>
            Its results can be incomplete or wrong. AI can miss real threats and can flag harmless
            messages.
          </li>
        </ul>
        <p>
          <strong>
            Always use your own judgment. If something feels unsafe, prioritize your safety and
            seek help from the appropriate authorities or professionals.
          </strong>{' '}
          You are solely responsible for any decisions you make based on the Service.
        </p>
      </section>

      <section>
        <h2>4. Your content</h2>
        <p>
          &quot;Your Content&quot; means the conversations, text, and screenshots you submit for
          analysis. You keep all rights to Your Content. By submitting it, you grant us a limited
          license to process it solely to provide the analysis you request.
        </p>
        <p>You represent that:</p>
        <ul>
          <li>
            You have the right to submit Your Content and to have it analyzed.
          </li>
          <li>
            Doing so does not violate any law or the rights of the other person in the
            conversation.
          </li>
        </ul>
        <p>
          As described in our <Link href="/privacy">Privacy Policy</Link>, we do not retain the raw
          conversation text after generating your result.
        </p>
      </section>

      <section>
        <h2>5. Accounts</h2>
        <p>
          You can use a free analysis without an account. If you create one, you are responsible
          for keeping your login credentials secure and for activity that happens under your
          account. Tell us promptly if you suspect unauthorized use.
        </p>
      </section>

      <section>
        <h2>6. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service to harass, stalk, threaten, or harm anyone.</li>
          <li>Submit content you have no right to share.</li>
          <li>
            Attempt to reverse-engineer, scrape, overload, or interfere with the Service or its
            security.
          </li>
          <li>Resell or commercially exploit the Service without our written permission.</li>
          <li>Use the Service for any unlawful purpose.</li>
        </ul>
      </section>

      <section>
        <h2>7. Free and paid features</h2>
        <p>
          Some features are free; others may require a paid plan. Pricing and what&apos;s included
          are shown at the point of purchase. If we introduce paid plans or change them, the terms
          presented at checkout apply. Unless stated otherwise or required by law, payments are
          non-refundable.
        </p>
      </section>

      <section>
        <h2>8. Intellectual property</h2>
        <p>
          The Service — including its software, design, and branding — belongs to Swipe Safe and
          is protected by law. These terms don&apos;t grant you any rights to our trademarks or
          content except the right to use the Service as intended.
        </p>
      </section>

      <section>
        <h2>9. Disclaimer of warranties</h2>
        <p>
          The Service is provided <strong>&quot;as is&quot;</strong> and{' '}
          <strong>&quot;as available&quot;</strong>, without warranties of any kind, whether
          express or implied, including fitness for a particular purpose, accuracy, or
          non-infringement. We do not warrant that the Service will be uninterrupted, error-free,
          or that its analysis will be accurate or complete.
        </p>
      </section>

      <section>
        <h2>10. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, Swipe Safe and its team will not be liable for
          any indirect, incidental, special, consequential, or punitive damages, or for any loss
          arising from your reliance on the Service or its analysis. Our total liability for any
          claim relating to the Service will not exceed the greater of the amount you paid us in
          the 12 months before the claim, or USD 50.
        </p>
      </section>

      <section>
        <h2>11. Indemnity</h2>
        <p>
          You agree to indemnify and hold Swipe Safe harmless from claims, losses, and expenses
          arising out of your use of the Service, your content, or your breach of these terms.
        </p>
      </section>

      <section>
        <h2>12. Termination</h2>
        <p>
          You may stop using the Service at any time and delete your account. We may suspend or
          terminate access if you violate these terms or to protect the Service and its users.
        </p>
      </section>

      <section>
        <h2>13. Changes to the Service and these terms</h2>
        <p>
          We may modify the Service or these terms from time to time. When we make material
          changes to the terms, we&apos;ll update the &quot;Last updated&quot; date above.
          Continuing to use the Service after changes take effect means you accept them.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          Questions about these terms? Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
