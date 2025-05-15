import { Link } from "wouter";

interface Destination {
  id: number;
  name: string;
  image: string;
  teeTimeCount: number;
}

export default function TopDestinationsSection() {
  const destinations: Destination[] = [
    {
      id: 1,
      name: "Pebble Beach",
      image: "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=300",
      teeTimeCount: 42
    },
    {
      id: 2,
      name: "Pinehurst",
      image: "https://pixabay.com/get/g632343b789562716e2f0f3965f961ac55f4a7f4245ef81569c7fa1a7a4fdb55baa9514396df9756b0cee821f6b75b120b526c0ff4a6a8c3c29905dad2c837e76_1280.jpg",
      teeTimeCount: 28
    },
    {
      id: 3,
      name: "Scottsdale",
      image: "https://pixabay.com/get/g2e9ce8299acc60bbaf5dba8801cac18ef9f585f6972e6a3f527827477cb49c67a365d3465e084ebcf683d87a37929d20c91d8823b1fa206f4e7e7d36479e4566_1280.jpg",
      teeTimeCount: 35
    },
    {
      id: 4,
      name: "Palm Springs",
      image: "https://pixabay.com/get/gb60b3bc2bb1f85edf03cc3ba269d8fdeab158cbeab05fa9a455a88ef451e28ec7bf0ba7495e70f3ac7566264960783c6f2fb419ae7a177c7afe8a60de82adf01_1280.jpg",
      teeTimeCount: 31
    }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-heading font-bold text-neutral-dark mb-8">Top Golf Destinations</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {destinations.map((destination) => (
            <Link 
              key={destination.id} 
              href={`/tee-times?location=${encodeURIComponent(destination.name)}`}
              className="block relative rounded-lg overflow-hidden h-40 group"
            >
              <img 
                src={destination.image} 
                alt={destination.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-3 left-3 text-white">
                <h3 className="font-heading font-bold text-lg">{destination.name}</h3>
                <p className="text-sm">{destination.teeTimeCount} tee times</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
