import React, { Suspense } from 'react';
import LoadingComponent from "../ui/components/loading";

interface SuspenseBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function SuspenseBoundary({ children, fallback = <LoadingComponent /> }: SuspenseBoundaryProps) {
  return (
    <Suspense fallback={fallback}>{children}</Suspense>
  );
}

