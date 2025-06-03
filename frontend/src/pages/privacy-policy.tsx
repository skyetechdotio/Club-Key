import { Helmet } from "react-helmet";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Linx Golf</title>
        <meta name="description" content="Learn about Linx Golf's privacy practices, how we collect, use, and protect your personal information, and your privacy rights as a user." />
      </Helmet>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-heading font-bold text-center mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground text-center mb-8">Last Updated: May 1, 2025</p>
        
        <div className="prose prose-lg max-w-none">
          <h2>Introduction</h2>
          <p>
            Linx Golf ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website or mobile applications (collectively, the "Platform") and tell you about your privacy rights and how the law protects you.
          </p>
          
          <h2>Information We Collect</h2>
          <p>
            We collect several different types of information for various purposes to provide and improve our service to you:
          </p>
          <h3>Personal Data</h3>
          <p>
            While using our Platform, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you. Personally identifiable information may include, but is not limited to:
          </p>
          <ul>
            <li>Email address</li>
            <li>First name and last name</li>
            <li>Phone number</li>
            <li>Address, State, Province, ZIP/Postal code, City</li>
            <li>Payment information</li>
            <li>Profile pictures</li>
            <li>Golf club memberships and affiliations</li>
          </ul>
          
          <h3>Usage Data</h3>
          <p>
            We may also collect information about how the Platform is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g., IP address), browser type, browser version, the pages of our Platform that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers, and other diagnostic data.
          </p>
          
          <h2>How We Use Your Information</h2>
          <p>
            Linx Golf uses the collected data for various purposes:
          </p>
          <ul>
            <li>To provide and maintain our Platform</li>
            <li>To notify you about changes to our Platform</li>
            <li>To allow you to participate in interactive features of our Platform</li>
            <li>To provide customer support</li>
            <li>To gather analysis or valuable information so that we can improve our Platform</li>
            <li>To monitor the usage of our Platform</li>
            <li>To detect, prevent and address technical issues</li>
            <li>To facilitate transactions between users</li>
            <li>To verify identity and prevent fraud</li>
          </ul>
          
          <h2>Data Security</h2>
          <p>
            The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its absolute security.
          </p>
          
          <h2>Data Retention</h2>
          <p>
            We will retain your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your Personal Data to the extent necessary to comply with our legal obligations (for example, if we are required to retain your data to comply with applicable laws), resolve disputes, and enforce our legal agreements and policies.
          </p>
          
          <h2>Your Data Protection Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal information, such as:
          </p>
          <ul>
            <li>The right to access, update or delete the information we have on you</li>
            <li>The right of rectification</li>
            <li>The right to object</li>
            <li>The right of restriction</li>
            <li>The right to data portability</li>
            <li>The right to withdraw consent</li>
          </ul>
          <p>
            If you wish to exercise any of these rights, please contact us.
          </p>
          
          <h2>Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top of this Privacy Policy.
          </p>
          <p>
            You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
          </p>
          
          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us:
          </p>
          <ul>
            <li>By email: <a href="mailto:privacy@linxgolf.com" className="text-primary hover:underline">privacy@linxgolf.com</a></li>
            <li>By visiting our <a href="/contact" className="text-primary hover:underline">contact page</a> on the Platform</li>
          </ul>
        </div>
      </div>
    </>
  );
}