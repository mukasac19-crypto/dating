import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy · Swipe Safe',
  description:
    'How Swipe Safe handles the conversations you analyze, the data we collect, and the choices you have.',
};

const LAST_UPDATED = 'May 31, 2026';
const CONTACT_EMAIL = 'privacy@swipesafe.app';

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro="Swipe Safe was built for moments when you feel vulnerable. This policy explains, in plain English, what happens to the conversations you analyze, what we collect, and the control you have over it."
    >
      <section>
        <h2>The short version</h2>
        <ul>
          <li>
            <strong>We don&apos;t keep your conversations.</strong> A chat you submit is sent to
            our AI provider for analysis and then discarded. We don&apos;t store the raw message
            text on our servers.
          </li>
          <li>
            <strong>We never sell your data.</strong> Not to advertisers, not to data brokers,
            not to anyone.
          </li>
          <li>
            <strong>The other person never knows.</strong> Nothing happens on the dating app
            itself — the analysis lives entirely on your side.
          </li>
          <li>
            <strong>You can use it without an account.</strong> Your first analysis needs no
            signup. An account only exists so you can save your history.
          </li>
        </ul>
      </section>

      <section>
        <h2>Who we are</h2>
        <p>
          Swipe Safe (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides an AI tool that
          analyzes dating-app and messaging conversations for signs of scams, manipulation, and
          healthy or unhealthy patterns. This policy applies to our website and the Swipe Safe
          web app.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>

        <h3>Conversations you submit for analysis</h3>
        <p>
          When you paste text or upload a screenshot, we send that content to our AI provider to
          generate your analysis. We process it only to produce the result you asked for. We do
          not retain the raw conversation after the analysis is returned, and we don&apos;t use it
          to train models.
        </p>
        <p>
          If you are signed in and choose to save an analysis, the <strong>result</strong> (the
          verdict, flags, and summary) is stored to your account history. You can delete it at any
          time from your dashboard.
        </p>

        <h3>Account information</h3>
        <p>
          If you create an account, we store your email address and authentication details so you
          can sign in and access your saved history. We never see your password in plain text.
        </p>

        <h3>Usage and device data</h3>
        <p>
          Like most websites, we collect basic technical information — such as browser type,
          device, approximate region, and pages visited — to keep the service running, prevent
          abuse, and understand how it&apos;s used. We use Google Analytics for aggregate usage
          statistics; it may set cookies in your browser.
        </p>
      </section>

      <section>
        <h2>How we use your information</h2>
        <ul>
          <li>To produce the conversation analysis you request.</li>
          <li>To let you create an account and access your saved history.</li>
          <li>To operate, maintain, and improve the service.</li>
          <li>To detect, prevent, and respond to fraud, abuse, or security issues.</li>
          <li>To comply with legal obligations.</li>
        </ul>
        <p>
          We do <strong>not</strong> use your conversations for advertising, and we do not sell or
          rent your personal information.
        </p>
      </section>

      <section>
        <h2>Service providers we share with</h2>
        <p>
          We rely on a small number of trusted providers to run Swipe Safe. They only process data
          on our behalf and under contract:
        </p>
        <ul>
          <li>
            <strong>AI analysis provider</strong> — processes the conversation text to generate
            your result.
          </li>
          <li>
            <strong>Hosting &amp; database</strong> — runs the app and stores your account and
            saved results.
          </li>
          <li>
            <strong>Analytics</strong> — Google Analytics, for aggregate usage statistics.
          </li>
        </ul>
        <p>
          We may also disclose information if required by law, or to protect the rights, safety,
          and security of our users and the service.
        </p>
      </section>

      <section>
        <h2>How long we keep things</h2>
        <ul>
          <li>
            <strong>Submitted conversations:</strong> not retained after the analysis is generated.
          </li>
          <li>
            <strong>Saved analysis results:</strong> kept until you delete them or close your
            account.
          </li>
          <li>
            <strong>Account data:</strong> kept while your account is active; deleted on request.
          </li>
        </ul>
      </section>

      <section>
        <h2>Your choices and rights</h2>
        <p>Depending on where you live, you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Correct or update inaccurate data.</li>
          <li>Delete your account and saved history.</li>
          <li>Object to or restrict certain processing.</li>
        </ul>
        <p>
          You can delete saved analyses directly from your dashboard. For anything else, email us
          at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we&apos;ll help.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          We use industry-standard measures to protect your data in transit and at rest. No system
          is perfectly secure, but minimizing what we store — especially by not retaining your
          conversations — is the core of how we protect you.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          Swipe Safe is not intended for anyone under 18. We do not knowingly collect data from
          children. If you believe a minor has used the service, contact us and we&apos;ll remove
          the data.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          We may update this policy from time to time. When we make material changes, we&apos;ll
          revise the &quot;Last updated&quot; date above and, where appropriate, notify you.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about your privacy? Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also our{' '}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
