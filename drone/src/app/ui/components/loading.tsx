export default function LoadingComponent() {
    return (
        <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
            <p className="ml-4 text-xl font-semibold">Loading...</p>
        </div>
    );
}

