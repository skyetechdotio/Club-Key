import { Helmet } from "react-helmet";
import { CalendarDays } from "lucide-react";

export default function PressPage() {
  const pressReleases = [
    {
      id: 1,
      title: "Linx Golf Raises $5M in Seed Funding to Expand Marketplace for Exclusive Golf Experiences",
      date: "April 12, 2025",
      summary: "Funding will accelerate growth and enhance platform features for the innovative golf tee time marketplace connecting club members with golf enthusiasts.",
    },
    {
      id: 2,
      title: "Linx Golf Launches Mobile App for iOS and Android",
      date: "February 28, 2025",
      summary: "New mobile application allows golfers to discover and book exclusive tee times at private clubs directly from their smartphones.",
    },
    {
      id: 3,
      title: "Linx Golf Partners with PGA of America to Expand Access to Premier Golf Courses",
      date: "January 15, 2025",
      summary: "Strategic partnership aims to increase accessibility to quality golf experiences while maintaining the integrity and traditions of private clubs.",
    },
  ];

  const mediaContacts = {
    pressInquiries: "press@linxgolf.com",
    partnerships: "partnerships@linxgolf.com",
    investorRelations: "investors@linxgolf.com",
  };

  return (
    <>
      <Helmet>
        <title>Press | Linx Golf</title>
        <meta name="description" content="Access press releases, media resources, and company information about Linx Golf, the leading marketplace for exclusive golf tee times." />
      </Helmet>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-heading font-bold text-center mb-8">Press Center</h1>
        
        <section className="mb-12">
          <h2 className="text-2xl font-heading font-bold mb-6">Latest Press Releases</h2>
          <div className="space-y-6">
            {pressReleases.map((release) => (
              <div key={release.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-heading font-semibold mb-2">{release.title}</h3>
                <div className="flex items-center text-sm text-muted-foreground mb-3">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {release.date}
                </div>
                <p className="text-muted-foreground">{release.summary}</p>
                <button className="mt-4 text-primary font-medium hover:underline">
                  Read More
                </button>
              </div>
            ))}
          </div>
        </section>
        
        <section className="mb-12">
          <h2 className="text-2xl font-heading font-bold mb-6">Media Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-heading font-semibold mb-2">Brand Assets</h3>
              <p className="text-muted-foreground mb-4">
                Download logos, screenshots, and other brand assets for use in media coverage.
              </p>
              <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-medium text-sm transition-colors">
                Access Brand Kit
              </button>
            </div>
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-heading font-semibold mb-2">Company Facts</h3>
              <p className="text-muted-foreground mb-4">
                Get key information about Linx Golf, including our history, mission, and growth metrics.
              </p>
              <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-medium text-sm transition-colors">
                Download Fact Sheet
              </button>
            </div>
          </div>
        </section>
        
        <section>
          <h2 className="text-2xl font-heading font-bold mb-6">Media Contacts</h2>
          <div className="border rounded-lg p-6">
            <p className="mb-4">
              For media inquiries, please contact our press team. We aim to respond to all inquiries within 24 hours.
            </p>
            <div className="space-y-3">
              <div>
                <p className="font-semibold">Press Inquiries:</p>
                <a href={`mailto:${mediaContacts.pressInquiries}`} className="text-primary hover:underline transition-colors">
                  {mediaContacts.pressInquiries}
                </a>
              </div>
              <div>
                <p className="font-semibold">Partnership Opportunities:</p>
                <a href={`mailto:${mediaContacts.partnerships}`} className="text-primary hover:underline transition-colors">
                  {mediaContacts.partnerships}
                </a>
              </div>
              <div>
                <p className="font-semibold">Investor Relations:</p>
                <a href={`mailto:${mediaContacts.investorRelations}`} className="text-primary hover:underline transition-colors">
                  {mediaContacts.investorRelations}
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}