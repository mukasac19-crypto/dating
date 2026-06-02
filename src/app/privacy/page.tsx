import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy · Swipe Safe',
  description:
    'How Swipe Safe handles conversations, Google user data, account information, analytics, and the choices you have.',
};

const LAST_UPDATED = 'May 31, 2026';
const CONTACT_EMAIL = 'privacy@swipesafe.app';

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro="Swipe Safe was built for moments when you feel vulnerable. This policy explains, in plain English, what happens to the conversations you analyze, what Google user data we access if you sign in with Google, what we collect, how we use it, and the control you have over it."
    >
      <section>
        <h2>The short version</h2>
        <ul>
          <li>
            <strong>We don&apos;t keep your submitted conversations.</strong> A chat you submit is
            sent to our AI provider for analysis and then discarded. We don&apos;t store the raw
            message text on our servers unless you choose a feature that explicitly saves content.
          </li>
          <li>
            <strong>We use Google user data only for account access.</strong> If you sign in with
            Google, we use your Google account information only to authenticate you and manage your
            Swipe Safe account.
          </li>
          <li>
            <strong>We never sell your data.</strong> Not to advertisers, not to data brokers, not
            to anyone.
          </li>
          <li>
            <strong>We do not use Google user data for advertising.</strong> We also do not use
            Google user data to train AI models.
          </li>
          <li>
            <strong>The other person never knows.</strong> Nothing happens on the dating app
            itself — the analysis lives entirely on your side.
          </li>
          <li>
            <strong>You can use Swipe Safe without an account.</strong> Your first analysis may be
            available without signup. An account only exists so you can sign in and access account
            features such as saved history, where available.
          </li>
        </ul>
      </section>

      <section>
        <h2>Who we are</h2>
        <p>
          Swipe Safe (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides an AI tool that
          analyzes dating-app and messaging conversations for signs of scams, manipulation, and
          healthy or unhealthy communication patterns. This policy applies to our website and the
          Swipe Safe web app.
        </p>
      </section>

      <section>
        <h2>Google user data</h2>

        <h3>Google data accessed</h3>
        <p>
          If you choose to sign in with Google or connect your Google account, Swipe Safe may
          access, collect, or interact with the following Google user data, depending on the
          permissions you approve on Google&apos;s consent screen:
        </p>
        <ul>
          <li>Your Google account email address.</li>
          <li>Your basic Google profile information, such as your name and profile picture.</li>
          <li>Your Google account unique user identifier, which helps us recognize your account.</li>
        </ul>
        <p>
          Swipe Safe does not access your Google password. We do not request access to your Gmail,
          Google Drive, Google Calendar, Google Contacts, or other Google account content unless
          that access is clearly shown to you on the Google consent screen and is necessary for a
          specific feature you choose to use.
        </p>

        <h3>How we use Google user data</h3>
        <p>We use Google user data only for the following purposes:</p>
        <ul>
          <li>To let you sign in to Swipe Safe using your Google account.</li>
          <li>To create and manage your Swipe Safe account.</li>
          <li>To identify your account when you return to the service.</li>
          <li>To display basic account information, such as your name, email, or profile picture.</li>
          <li>To protect account security, prevent abuse, and maintain the service.</li>
        </ul>
        <p>
          We do not use Google user data for advertising. We do not sell, rent, or trade Google
          user data. We do not use Google user data to train AI models.
        </p>

        <h3>How we store Google user data</h3>
        <p>
          We store only the Google user data needed to operate your Swipe Safe account, such as
          your email address, name, profile picture, and Google account identifier. This information
          is stored securely with our authentication, hosting, and database providers.
        </p>

        <h3>How we share Google user data</h3>
        <p>
          We do not share Google user data with advertisers or data brokers. We may share Google
          user data only with service providers that help us operate Swipe Safe, such as
          authentication, hosting, database, security, and infrastructure providers. These providers
          process data on our behalf and are not allowed to use it for their own independent
          purposes.
        </p>
        <p>
          We may also disclose Google user data if required by law, regulation, legal process, or
          to protect the rights, safety, and security of Swipe Safe, our users, or others.
        </p>

        <h3>Google API Services User Data Policy</h3>
        <p>
          Swipe Safe&apos;s use and transfer of information received from Google APIs will adhere
          to the Google API Services User Data Policy, including the Limited Use requirements.
        </p>

        <h3>Deleting or revoking Google access</h3>
        <p>
          You can request deletion of Google user data associated with your Swipe Safe account by
          emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. You can also revoke
          Swipe Safe&apos;s access to your Google account from your Google Account permissions
          settings.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>

        <h3>Conversations you submit for analysis</h3>
        <p>
          When you paste text or upload a screenshot, we send that content to our AI provider to
          generate your analysis. We process it only to produce the result you asked for. We do not
          retain the raw conversation after the analysis is returned, and we don&apos;t use it to
          train models.
        </p>
        <p>
          If you are signed in and choose to save an analysis, the <strong>result</strong> of the
          analysis, such as the verdict, flags, risk indicators, and summary, may be stored in your
          account history. You can delete saved analysis results from your dashboard where that
          feature is available, or by contacting us.
        </p>

        <h3>Account information</h3>
        <p>
          If you create an account, we may store your email address, authentication details, and
          basic profile information so you can sign in and access your account. If you sign in with
          Google, this may include your Google email address, name, profile picture, and Google
          account identifier. We never see or store your Google password.
        </p>

        <h3>Usage and device data</h3>
        <p>
          Like most websites, we collect basic technical information — such as browser type,
          device type, approximate region, pages visited, referring pages, and interactions with
          the service — to keep the service running, prevent abuse, improve performance, and
          understand how Swipe Safe is used.
        </p>
        <p>
          We may use Google Analytics for aggregate usage statistics. Google Analytics may set
          cookies or similar technologies in your browser. Analytics data is used to understand
          general usage patterns and improve the service, not to analyze your private conversations
          for advertising.
        </p>

        <h3>Communications with us</h3>
        <p>
          If you contact us by email or another support channel, we may collect your name, email
          address, message content, and any information you choose to include so we can respond to
          your request.
        </p>
      </section>

      <section>
        <h2>How we use your information</h2>
        <ul>
          <li>To produce the conversation analysis you request.</li>
          <li>To let you create, access, and manage your account.</li>
          <li>To authenticate you, including through Google Sign-In if you choose to use it.</li>
          <li>To save analysis results to your account history when you choose to save them.</li>
          <li>To operate, maintain, secure, and improve the service.</li>
          <li>To detect, prevent, and respond to fraud, abuse, spam, or security issues.</li>
          <li>To respond to your questions, requests, or support messages.</li>
          <li>To comply with legal obligations.</li>
        </ul>
        <p>
          We do <strong>not</strong> use your submitted conversations or Google user data for
          advertising. We do <strong>not</strong> sell or rent your personal information.
        </p>
      </section>

      <section>
        <h2>Service providers we share with</h2>
        <p>
          We rely on a small number of trusted providers to run Swipe Safe. They only process data
          on our behalf and under contract. These may include:
        </p>
        <ul>
          <li>
            <strong>AI analysis provider</strong> — processes submitted conversation text or
            screenshots to generate your requested result.
          </li>
          <li>
            <strong>Authentication provider</strong> — helps users sign in securely, including
            through Google Sign-In where available.
          </li>
          <li>
            <strong>Hosting and database providers</strong> — run the app and store account data,
            saved analysis results, and related service data.
          </li>
          <li>
            <strong>Analytics provider</strong> — Google Analytics, for aggregate usage statistics.
          </li>
          <li>
            <strong>Security and infrastructure providers</strong> — help protect, monitor, and
            operate the service.
          </li>
        </ul>
        <p>
          We may also disclose information if required by law, regulation, legal process, or to
          protect the rights, safety, and security of our users, Swipe Safe, or others.
        </p>
      </section>

      <section>
        <h2>AI processing</h2>
        <p>
          Swipe Safe uses AI to analyze conversations you submit. Submitted content may include
          sensitive or personal information depending on what you paste or upload. You should avoid
          submitting information that you do not want processed for analysis.
        </p>
        <p>
          We send submitted content to our AI provider only to generate the analysis you requested.
          We do not use submitted conversations to train AI models, and we do not sell submitted
          conversations.
        </p>
      </section>

      <section>
        <h2>How long we keep things</h2>
        <ul>
          <li>
            <strong>Submitted conversations:</strong> not retained after the analysis is generated,
            unless you choose a feature that explicitly saves content.
          </li>
          <li>
            <strong>Saved analysis results:</strong> kept until you delete them or close your
            account.
          </li>
          <li>
            <strong>Account data:</strong> kept while your account is active and deleted or
            de-identified after account deletion, unless we need to keep limited information for
            legal, security, or fraud-prevention reasons.
          </li>
          <li>
            <strong>Google user data:</strong> kept only as long as needed to operate your account
            or as required by law.
          </li>
          <li>
            <strong>Analytics and usage data:</strong> kept for a reasonable period to understand
            service performance, prevent abuse, and improve the service.
          </li>
          <li>
            <strong>Support communications:</strong> kept as long as needed to respond to you and
            maintain business records.
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
          <li>Request deletion of Google user data associated with your account.</li>
          <li>Object to or restrict certain processing.</li>
          <li>Withdraw consent where processing is based on consent.</li>
        </ul>
        <p>
          You can delete saved analyses directly from your dashboard where that feature is
          available. For account deletion, Google data deletion, access requests, or anything else,
          email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we&apos;ll help.
        </p>
      </section>

      <section>
        <h2>Cookies and analytics</h2>
        <p>
          Swipe Safe may use cookies and similar technologies to keep the service working, remember
          preferences, protect against abuse, and understand aggregate usage. Google Analytics may
          use cookies or similar technologies to help us understand how users interact with the
          service.
        </p>
        <p>
          You can control cookies through your browser settings. Blocking some cookies may affect
          how the service works.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          We use reasonable technical and organizational measures to protect your data in transit
          and at rest. No system is perfectly secure, but minimizing what we store — especially by
          not retaining submitted conversations after analysis — is a core part of how we protect
          users.
        </p>
      </section>

      <section>
        <h2>International users</h2>
        <p>
          Swipe Safe may process and store information in countries other than the country where
          you live. Where required, we use appropriate safeguards for international data transfers.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          Swipe Safe is not intended for anyone under 18. We do not knowingly collect data from
          children. If you believe a minor has used the service, contact us and we&apos;ll take
          appropriate steps to remove the data.
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
          Questions about your privacy or Google user data? Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also our{' '}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </section>
    </LegalPage>
  );
}