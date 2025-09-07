import Image from 'next/image';
import SocialMediaLinks from '../ui/components/socials';

export default function AboutPage() {
    return (
        <div className="bg-white py-12 sm:py-16">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:mx-0">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">About Us</h2>
                    <p className="mt-2 text-lg leading-8 text-gray-600">
                        Empowering professionals through accessible, high-quality technical education.
                    </p>
                </div>
                <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 border-t border-gray-200 pt-10 sm:mt-16 sm:pt-16 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                    <div className="flex flex-col lg:col-span-2">
                        <h3 className="text-2xl font-bold tracking-tight text-gray-900">Our Mission</h3>
                        <p className="mt-4 text-base text-gray-600">
                            At Drone Training Pro, we believe that mastering technology grants individuals greater control and freedom in their personal and professional lives. Our mission is to provide clear, concise, and practical learning paths in complex technical fields.
                        </p>
                        <p className="mt-4 text-base text-gray-600">
                            Whether you're studying for a certification, seeking to understand industry regulations, or enhancing your skills for a project, our courses and articles are designed to support your growth. We break down intricate topics into manageable components, ensuring you gain the knowledge and confidence to succeed.
                        </p>
                    </div>
                    <div className="relative h-80 w-full lg:h-full">
                        <Image
                            className="rounded-2xl bg-gray-50 object-cover"
                            src="/globe.svg" // NOTE: You will need to add an image
                            alt="A drone flying over a modern city skyline"
                            layout="fill"
                        />
                    </div>
                </div>
                <div className="mx-auto mt-16 max-w-2xl border-t border-gray-200 pt-10 sm:pt-16">
                    <h3 className="text-2xl font-bold tracking-tight text-center text-gray-900">Connect With Us</h3>
                    <p className="mt-4 text-center text-gray-600">
                        Have questions or want to learn more? <a href="/contact" className="font-semibold text-blue-600 hover:text-blue-500">Send us a message</a> or find us on social media.
                    </p>
                    <div className="mt-8">
                        <SocialMediaLinks />
                    </div>
                </div>
            </div>
        </div>
    )
}