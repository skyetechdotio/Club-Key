import { Helmet } from "react-helmet";

export default function TermsOfServicePage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service | Linx Golf</title>
        <meta name="description" content="Review Linx Golf's terms of service, including user responsibilities, platform rules, and legal agreements for using our golf tee time marketplace." />
      </Helmet>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-heading font-bold text-center mb-8">Terms of Service</h1>
        <p className="text-muted-foreground text-center mb-8">Last Updated: May 1, 2025</p>
        
        <div className="prose prose-lg max-w-none">
          <h2>Agreement to Terms</h2>
          <p>
            These Terms of Service ("Terms") constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Linx Golf, Inc. ("Company", "we", "us", or "our"), concerning your access to and use of the Linx Golf platform via website and mobile applications (collectively, the "Platform").
          </p>
          <p>
            You agree that by accessing the Platform, you have read, understood, and agree to be bound by all of these Terms. If you do not agree with all of these Terms, then you are expressly prohibited from using the Platform and you must discontinue use immediately.
          </p>
          
          <h2>User Accounts</h2>
          <h3>Account Creation</h3>
          <p>
            To use certain features of the Platform, you must register for an account with us. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
          </p>
          
          <h3>Account Responsibilities</h3>
          <p>
            You are responsible for safeguarding your password and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account or any other breach of security.
          </p>
          
          <h2>Marketplace Rules</h2>
          <h3>For Hosts</h3>
          <p>
            As a host on the Linx Golf platform, you agree to:
          </p>
          <ul>
            <li>Only list tee times at clubs where you have valid membership or playing privileges</li>
            <li>Accurately represent the tee times, pricing, and club facilities you are offering</li>
            <li>Honor all bookings made through the platform</li>
            <li>Comply with all club rules and regulations when hosting guests</li>
            <li>Maintain appropriate communication with guests before and after bookings</li>
            <li>Not discriminate against guests on any basis protected by applicable law</li>
          </ul>
          
          <h3>For Guests</h3>
          <p>
            As a guest on the Linx Golf platform, you agree to:
          </p>
          <ul>
            <li>Accurately represent your golf experience and abilities</li>
            <li>Honor all bookings you make through the platform</li>
            <li>Follow proper golf etiquette and all club rules when visiting</li>
            <li>Treat hosts and club facilities with respect</li>
            <li>Provide accurate information for all required verifications</li>
            <li>Arrive on time for your tee time</li>
          </ul>
          
          <h2>Payments and Fees</h2>
          <p>
            Linx Golf charges service fees for the use of our Platform. Fees are calculated as a percentage of the transaction amount and will be clearly displayed before you complete a booking.
          </p>
          <p>
            When you book a tee time through our Platform, you authorize us to charge the payment method you provide for the total amount shown, including the tee time fee and applicable service fees.
          </p>
          <p>
            All payments are held in escrow until 24 hours after the scheduled tee time to ensure both parties are satisfied with the transaction. Refunds and cancellations are subject to our separate Cancellation Policy.
          </p>
          
          <h2>Intellectual Property Rights</h2>
          <p>
            The Platform and its entire contents, features, and functionality are owned by Linx Golf, Inc., its licensors, or other providers of such material and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
          </p>
          <p>
            You are permitted to use the Platform for your personal, non-commercial use only. You must not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our Platform.
          </p>
          
          <h2>Disclaimers</h2>
          <p>
            THE PLATFORM IS PROVIDED ON AN "AS-IS" AND "AS AVAILABLE" BASIS. LINX GOLF MAKES NO WARRANTIES, EXPRESSED OR IMPLIED, AND HEREBY DISCLAIMS AND NEGATES ALL OTHER WARRANTIES, INCLUDING WITHOUT LIMITATION, IMPLIED WARRANTIES OR CONDITIONS OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT OF INTELLECTUAL PROPERTY OR OTHER VIOLATION OF RIGHTS.
          </p>
          
          <h2>Limitation of Liability</h2>
          <p>
            IN NO EVENT SHALL LINX GOLF, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES, BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE PLATFORM.
          </p>
          
          <h2>Termination</h2>
          <p>
            We may terminate or suspend your account and bar access to the Platform immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
          </p>
          
          <h2>Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. If we make changes, we will provide notice by posting the updated Terms on our Platform and updating the "Last Updated" date. Your continued use of the Platform after any such changes constitutes your acceptance of the new Terms.
          </p>
          
          <h2>Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us:
          </p>
          <ul>
            <li>By email: <a href="mailto:legal@linxgolf.com" className="text-primary hover:underline">legal@linxgolf.com</a></li>
            <li>By visiting our <a href="/contact" className="text-primary hover:underline">contact page</a> on the Platform</li>
          </ul>
        </div>
      </div>
    </>
  );
}