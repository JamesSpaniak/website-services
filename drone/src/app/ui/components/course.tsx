import Link from "next/link";
import Image from "next/image";
import { CourseData } from "@/app/lib/data/units";

export default function CourseComponent({ id: courseId, title, sub_title, description, image_url, units }: CourseData) {
    console.log(courseId);
    return (
        <div className="p-4 md:p-8 bg-gray-50 rounded-lg">
            {image_url && (
                <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden">
                    <Image src="/file.svg"/*{image_url} TODO*/ alt={title} layout="fill" objectFit="cover" />
                </div>
            )}
            <h1 className="text-4xl font-extrabold mb-2 text-gray-900">{title}</h1>
            {sub_title && <h2 className="text-xl text-gray-600 mb-4">{sub_title}</h2>}
            {description && <p className="text-gray-700 mb-8 leading-relaxed">{description}</p>}
            
            <h3 className="text-3xl font-bold border-b-2 border-gray-200 pb-2 mb-6 text-gray-800">Course Units</h3>
            <div className="space-y-3">
                {units && units.length > 0 ? (
                    units.map((unit) => (
                        <Link key={unit.id} href={`/dashboard/courses/${courseId}/units/${unit.id}`} className="block p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all duration-200">
                            <h4 className="text-xl font-semibold text-blue-700">{unit.title}</h4>
                        </Link>
                    ))
                ) : (
                    <p className="text-gray-500">No units available for this course.</p>
                )}
            </div>
        </div>
    )
}