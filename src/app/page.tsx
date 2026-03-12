"use client";

export default function Home() {
  return (
    <div className="flex h-screen">
      <main className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-foreground">InterruptQ</h1>
        <p className="mt-2 text-muted-foreground">
          Time tracking for the constantly interrupted.
        </p>
      </main>
    </div>
  );
}
