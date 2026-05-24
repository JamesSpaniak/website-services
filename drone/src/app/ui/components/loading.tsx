export default function LoadingComponent() {
    return (
        <div className="relative z-10 flex justify-center items-center min-h-[40vh]">
            <div className="animate-spin h-8 w-8 border-2 border-[var(--brand-primary)] border-t-transparent" style={{ borderRadius: '50%' }} />
            <span className="sr-only">Loading...</span>
        </div>
    );
}

