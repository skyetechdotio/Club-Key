import { Helmet } from "react-helmet";

export default function CookiePolicyPage() {
  return (
    <>
      <Helmet>
        <title>Cookie Policy | Linx Golf</title>
        <meta name="description" content="Learn about how Linx Golf uses cookies and similar technologies, what data we collect, and how you can manage your cookie preferences." />
      </Helmet>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-heading font-bold text-center mb-8">Cookie Policy</h1>
        <p className="text-muted-foreground text-center mb-8">Last Updated: May 1, 2025</p>
        
        <div className="prose prose-lg max-w-none">
          <h2>What Are Cookies</h2>
          <p>
            Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the owners of the site. Cookies enhance user experience by allowing websites to remember your preferences and understand how you use different parts of a website.
          </p>
          
          <h2>How We Use Cookies</h2>
          <p>
            Linx Golf uses cookies and similar technologies for several purposes, depending on the context or service, including:
          </p>
          <ul>
            <li>
              <strong>Authentication and security</strong>: To log you in, verify your identity, and help maintain the security of your account.
            </li>
            <li>
              <strong>Preferences</strong>: To remember information about your browser and preferences, such as your preferred language or location.
            </li>
            <li>
              <strong>Analytics</strong>: To understand how visitors interact with our platform, which pages are visited most often, or if visitors receive error messages.
            </li>
            <li>
              <strong>Service performance</strong>: To monitor and improve how our platform performs.
            </li>
            <li>
              <strong>Advertising</strong>: To deliver advertisements that are more relevant to you and your interests, and to measure the effectiveness of our advertising campaigns.
            </li>
          </ul>
          
          <h2>Types of Cookies We Use</h2>
          <h3>Essential Cookies</h3>
          <p>
            These cookies are necessary for the website to function and cannot be switched off in our systems. They are usually only set in response to actions made by you which amount to a request for services, such as setting your privacy preferences, logging in, or filling in forms. You can set your browser to block or alert you about these cookies, but some parts of the site will not then work.
          </p>
          <h3>Performance Cookies</h3>
          <p>
            These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular and see how visitors move around the site. All information these cookies collect is aggregated and therefore anonymous.
          </p>
          <h3>Functionality Cookies</h3>
          <p>
            These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages. If you do not allow these cookies then some or all of these services may not function properly.
          </p>
          <h3>Targeting Cookies</h3>
          <p>
            These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant advertisements on other sites. They do not store directly personal information but are based on uniquely identifying your browser and internet device.
          </p>
          
          <h2>Third-Party Cookies</h2>
          <p>
            In addition to our own cookies, we may also use various third-party cookies to report usage statistics, deliver advertisements, and so on. These cookies may include:
          </p>
          <ul>
            <li>Google Analytics</li>
            <li>Facebook Pixel</li>
            <li>Stripe</li>
            <li>Intercom</li>
          </ul>
          
          <h2>Managing Cookies</h2>
          <p>
            Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, including how to see what cookies have been set, visit <a href="https://www.allaboutcookies.org" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.allaboutcookies.org</a>.
          </p>
          <p>
            You can set your browser not to accept cookies, and the above website tells you how to remove cookies from your browser. However, in a few cases, some features of our website may not function as a result.
          </p>
          
          <h2>Our Cookie Consent Tool</h2>
          <p>
            When you first visit our platform, you will be presented with a cookie banner that allows you to accept or decline non-essential cookies. You can change your preferences at any time by clicking on the "Cookie Preferences" link in the footer of our website.
          </p>
          
          <h2>Changes to Our Cookie Policy</h2>
          <p>
            We may update our Cookie Policy from time to time. We will notify you of any changes by posting the new Cookie Policy on this page and updating the "Last Updated" date at the top.
          </p>
          <p>
            We encourage you to review this Cookie Policy periodically to stay informed about how we are using cookies.
          </p>
          
          <h2>Contact Us</h2>
          <p>
            If you have any questions about our use of cookies or this Cookie Policy, please contact us:
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