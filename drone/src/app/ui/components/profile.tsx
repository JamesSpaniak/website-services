import { UserDto } from "@/app/lib/data/profile";
import Image from 'next/image';

export default function ProfileComponent({ user }: { user: UserDto }) {
    const { first_name, last_name, picture_url, email, username } = user;
    const displayName = (first_name && last_name) ? `${first_name} ${last_name}` : username;

    return (
        <div className="p-4 md:p-8 bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-4">User Profile</h1>
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                <div className="flex-shrink-0">
                    {picture_url ? (
                        <Image
                            src={picture_url}
                            alt={`Profile picture of ${displayName}`}
                            width={150}
                            height={150}
                            className="rounded-full object-cover border-4 border-gray-200"
                        />
                    ) : (
                        <div className="w-[150px] h-[150px] bg-gray-200 rounded-full flex items-center justify-center border-4 border-gray-200">
                            <span className="text-gray-500 text-lg">No Image</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-col pt-4 text-center md:text-left">
                    <h2 className="text-4xl font-bold text-gray-900">{displayName}</h2>
                    {email && <p className="text-gray-600 mt-2 text-lg">{email}</p>}
                    <p className="text-gray-500 mt-1 text-md">@{username}</p>
                </div>
            </div>
            
            <div className="mt-10">
                <h3 className="text-2xl font-semibold border-b pb-2 mb-4 text-gray-800">Course Progress</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">Course progress tracking will be displayed here in the future.</p>
                </div>
            </div>
        </div>
    );
}

