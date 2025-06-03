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
      image: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=300",
      teeTimeCount: 28
    },
    {
      id: 3,
      name: "Scottsdale",
      image: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=300",
      teeTimeCount: 35
    },
    {
      id: 4,
      name: "Palm Springs",
      image: "https://images.unsplash.com/photo-1551524164-687a55dd1126?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=300",
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
