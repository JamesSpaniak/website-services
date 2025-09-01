export default function ErrorComponent({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-8 m-4 bg-red-100 border-2 border-red-400 text-red-700 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold">An Error Occurred</h2>
            <p className="mt-2 text-center">{message}</p>
        </div>
    );
}

