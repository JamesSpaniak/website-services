import Link from 'next/link';
import Image from 'next/image';

interface CoursePreviewProps {
    id: number;
    title: string;
    sub_title?: string;
    image_url?: string;
    unitCount: number;
}

export default function CoursePreviewComponent({ id, title, sub_title, image_url, unitCount }: CoursePreviewProps) {
    return (
        <Link href={`/courses/${id}`} className="block p-4 mb-4 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <div className="flex flex-col h-full">
                {image_url && (
                    <div className="relative w-full h-48 mb-4">
                        <Image
                            src="/globe.svg" //{image_url} TODO set to pull file
                            alt={`Preview for ${title}`}
                            layout="fill"
                            objectFit="cover"
                            className="rounded-t-md"
                        />
                    </div>
                )}
                <div className="flex-grow flex flex-col p-2">
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                    {sub_title && <p className="text-md text-gray-600 mt-1 flex-grow">{sub_title}</p>}
                    <div className="mt-4">
                        <span className="px-3 py-1 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full">
                            {unitCount} {unitCount === 1 ? 'Unit' : 'Units'}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
