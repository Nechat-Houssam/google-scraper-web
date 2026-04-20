"use client"
import { TrackerProvider } from '@/context/TrackerContext';
import { Header } from '@/components/layout/Header';
import { StatusBar } from '@/components/layout/StatusBar';
import { DragBoard } from '@/components/features/DragBoard';

export default function Home() {
  return (
    <TrackerProvider>
      <main className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans text-gray-900">
        <Header />
        <StatusBar />
        <DragBoard />
      </main>
    </TrackerProvider>
  );
}