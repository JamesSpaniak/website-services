import Link from 'next/link';

export default function HeaderComponent() {
  return (
    <header className="flex px-3 py-4 md:px-2 w-full justify-center rounded-lg">
        <Link className="flex justify-start bg-blue-600 p-4" href="/">
            <div className="w-32 text-white md:w-40">
                {/* Your logo or site title */}
                Drone Training Pro
            </div>
        </Link>
        <div className="flex grow items-center justify-center w-full space-x-2 md:space-x-10 bg-gray-50">
            <Link href="/dashboard" className="flex h-[32px] text-black grow items-center justify-center gap-2 rounded-md bg-gray-100 p-3 text-md font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 px-3">
                Dashboard
            </Link>
            <Link href="/dashboard/courses" className="flex h-[32px] text-black grow items-center justify-center gap-2 rounded-md bg-gray-100 p-3 text-md font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 px-3">
                Courses
            </Link>
            <Link href="/dashboard/about" className="flex h-[32px] text-black grow items-center justify-center gap-2 rounded-md bg-gray-100 p-3 text-md font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 px-3">
                About
            </Link>
        </div>
        <div className="flex justify-end items-center space-x-2 md:space-x-10 bg-gray-50 px-5">
            <Link href="/dashboard/profile" className="flex h-[32px] text-black grow items-center justify-center gap-2 rounded-md bg-gray-100 p-3 text-md font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 px-3">
                Profile
            </Link>
        </div>
    </header>
  );
}