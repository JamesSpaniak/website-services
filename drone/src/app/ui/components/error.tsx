export default function ErrorComponent({ message }: { message: string }) {
    return (
        <div className="relative z-10 flex flex-col items-center justify-center p-8 m-4 border border-red-400/50 bg-red-400/10 text-red-400 text-center" style={{ borderRadius: 'var(--radius-md)' }}>
            <h2 className="text-lg font-display font-semibold">Error</h2>
            <p className="mt-2 text-sm">{message}</p>
        </div>
    );
}

